import type { AdminAuthContext, AuthContext } from '../../shared/auth/index.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
import type { DomainEventBus } from '../../shared/events/domain-events.js';
import { buildPage, mapPage } from '../../shared/pagination/cursor-pagination.js';
import type { Paginated } from '../../types/api.types.js';
import {
  presentPlan,
  type CreatePlanDto,
  type ListPlansQuery,
  type PlanView,
  type UpdatePlanDto,
} from './plans.dto.js';
import type { PlanEntity } from './plans.entity.js';
import type { PlansRepository } from './plans.repository.js';

export class PlansService {
  constructor(
    private readonly repository: PlansRepository,
    private readonly events: DomainEventBus,
  ) {}

  /**
   * Context rule: admins see every plan and may filter by `isActive`;
   * libraries only ever see active plans, whatever they send.
   */
  async list(actor: AuthContext, query: ListPlansQuery): Promise<Paginated<PlanView>> {
    const isActive = this.scopeIsActive(actor, query.isActive);

    const rows = await this.repository.list({
      filter: { isActive, name: query.name, minPrice: query.minPrice, maxPrice: query.maxPrice },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return mapPage(buildPage(rows, query.limit, (plan) => plan.id), presentPlan);
  }

  async getById(actor: AuthContext, planId: number): Promise<PlanView> {
    const plan = await this.repository.findById(planId);
    // Inactive plans are reported as "not found" to non-admins (no information leak).
    if (!plan || !this.canView(actor, plan)) {
      throw new NotFoundError('Plan');
    }
    return presentPlan(plan);
  }

  async create(admin: AdminAuthContext, dto: CreatePlanDto): Promise<PlanView> {
    await this.assertNameAvailable(dto.name);
    const plan = await this.repository.create(dto);
    this.events.emit('plan.created', { planId: plan.id, byAdminId: admin.profileId });
    return presentPlan(plan);
  }

  /** Changing `durationDays` never affects existing subscriptions: they keep a duration snapshot. */
  async update(admin: AdminAuthContext, planId: number, dto: UpdatePlanDto): Promise<PlanView> {
    await this.getExistingOrThrow(planId);
    if (dto.name !== undefined) {
      await this.assertNameAvailable(dto.name, planId);
    }
    const plan = await this.repository.update(planId, dto);
    this.events.emit('plan.updated', { planId: plan.id, byAdminId: admin.profileId });
    return presentPlan(plan);
  }

  /** Plans referenced by subscriptions cannot be deleted (FK Restrict) — deactivate them instead. */
  async delete(admin: AdminAuthContext, planId: number): Promise<void> {
    await this.getExistingOrThrow(planId);
    if ((await this.repository.countSubscriptions(planId)) > 0) {
      throw new ConflictError(
        'Plan has subscriptions and cannot be deleted. Set isActive=false instead.',
        'PLAN_IN_USE',
      );
    }
    await this.repository.delete(planId);
    this.events.emit('plan.deleted', { planId, byAdminId: admin.profileId });
  }

  private scopeIsActive(actor: AuthContext, requested: boolean | undefined): boolean | undefined {
    switch (actor.role) {
      case 'ADMIN':
        return requested;
      case 'LIBRARY':
        return true;
      case 'USER':
        throw new ForbiddenError('Plans are not available to user accounts');
    }
  }

  private canView(actor: AuthContext, plan: PlanEntity): boolean {
    return actor.role === 'ADMIN' || (actor.role === 'LIBRARY' && plan.isActive);
  }

  private async getExistingOrThrow(planId: number): Promise<PlanEntity> {
    const plan = await this.repository.findById(planId);
    if (!plan) throw new NotFoundError('Plan');
    return plan;
  }

  private async assertNameAvailable(name: string, excludeId?: number): Promise<void> {
    if (await this.repository.nameExists(name, excludeId)) {
      throw new ConflictError('A plan with this name already exists', 'PLAN_NAME_TAKEN');
    }
  }
}
