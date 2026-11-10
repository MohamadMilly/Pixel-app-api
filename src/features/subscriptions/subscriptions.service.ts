import type { AdminAuthContext, AuthContext, LibraryAuthContext } from '../../shared/auth/index.js';
import { ConflictError, NotFoundError } from '../../shared/errors/index.js';
import type { DomainEventBus } from '../../shared/events/domain-events.js';
import { buildPage, mapPage } from '../../shared/pagination/cursor-pagination.js';
import { addDays, maxDate } from '../../shared/utils/date.js';
import type { Paginated } from '../../types/api.types.js';
import {
  presentSubscription,
  presentSubscriptionForAdmin,
  type ListSubscriptionsQuery,
  type RequestSubscriptionDto,
  type SubscriptionView,
} from './subscriptions.dto.js';
import type { SubscriptionDetails } from './subscriptions.entity.js';
import { subscriptionPolicy } from './subscriptions.policy.js';
import type { SubscriptionsRepository } from './subscriptions.repository.js';

export class SubscriptionsService {
  constructor(
    private readonly repository: SubscriptionsRepository,
    private readonly events: DomainEventBus,
  ) {}

  async list(actor: AuthContext, query: ListSubscriptionsQuery): Promise<Paginated<SubscriptionView>> {
    const now = new Date();
    const libraryId = subscriptionPolicy.listScope(actor, query.libraryId);

    const rows = await this.repository.list({
      filter: { libraryId, planId: query.planId, status: query.status, now },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return mapPage(buildPage(rows, query.limit, (s) => s.id), (s) => this.present(actor, s, now));
  }

  async getById(actor: AuthContext, subscriptionId: number): Promise<SubscriptionView> {
    const subscription = await this.repository.findById(subscriptionId);
    // Someone else's subscription is reported as 404, not 403, so ids cannot be probed (IDOR).
    if (!subscription || !subscriptionPolicy.canView(actor, subscription)) {
      throw new NotFoundError('Subscription');
    }
    return this.present(actor, subscription, new Date());
  }

  /** A library requests a plan for ITSELF — libraryId comes from the token, never from input. */
  async request(actor: LibraryAuthContext, dto: RequestSubscriptionDto): Promise<SubscriptionView> {
    const created = await this.repository.transaction(async (repo) => {
      const plan = await repo.findActivePlan(dto.planId);
      if (!plan) {
        throw new NotFoundError('Plan', 'PLAN_NOT_FOUND');
      }
      if (await repo.hasPendingRequest(actor.profileId)) {
        throw new ConflictError(
          'You already have a pending subscription request. Cancel it or wait for an admin.',
          'PENDING_REQUEST_EXISTS',
        );
      }
      return repo.createPending(actor.profileId, { id: plan.id, durationDays: plan.durationDays });
    });

    this.events.emit('subscription.requested', {
      subscriptionId: created.id,
      libraryId: created.libraryId,
      planId: created.planId,
    });
    return presentSubscription(created, new Date());
  }

  /**
   * Admin activation. If the library still has time left on a subscription,
   * the new one is scheduled to start when that one ends (renewals stack, never overlap).
   */
  async activate(admin: AdminAuthContext, subscriptionId: number): Promise<SubscriptionView> {
    const now = new Date();

    const activated = await this.repository.transaction(async (repo) => {
      const subscription = await repo.findById(subscriptionId);
      if (!subscription) {
        throw new NotFoundError('Subscription');
      }
      if (subscription.activatedAt !== null) {
        throw new ConflictError('Subscription is already activated', 'SUBSCRIPTION_ALREADY_ACTIVATED');
      }

      const latestExpiry = await repo.findLatestExpiry(subscription.libraryId, now);
      const activatedAt = latestExpiry ? maxDate(latestExpiry, now) : now;
      const expiresAt = addDays(activatedAt, subscription.durationDays);

      const updated = await repo.markActivated(subscription.id, {
        activatedAt,
        expiresAt,
        activatedByAdminId: admin.profileId,
      });
      if (!updated) {
        throw new ConflictError('Subscription was modified concurrently, please retry', 'TRANSACTION_CONFLICT');
      }

      const reloaded = await repo.findById(subscription.id);
      if (!reloaded) throw new NotFoundError('Subscription');
      return reloaded;
    });

    if (activated.activatedAt && activated.expiresAt) {
      this.events.emit('subscription.activated', {
        subscriptionId: activated.id,
        libraryId: activated.libraryId,
        byAdminId: admin.profileId,
        activatedAt: activated.activatedAt,
        expiresAt: activated.expiresAt,
      });
    }
    return presentSubscriptionForAdmin(activated, now);
  }

  /** A library withdraws ITS OWN pending request. */
  async cancel(actor: LibraryAuthContext, subscriptionId: number): Promise<void> {
    const subscription = await this.repository.findById(subscriptionId);
    if (!subscription || !subscriptionPolicy.canCancel(actor, subscription)) {
      throw new NotFoundError('Subscription');
    }
    await this.deletePendingOrThrow(subscription);
    this.events.emit('subscription.cancelled', {
      subscriptionId: subscription.id,
      libraryId: subscription.libraryId,
    });
  }

  /** Admin rejects any pending request (e.g. payment never received). */
  async reject(admin: AdminAuthContext, subscriptionId: number): Promise<void> {
    const subscription = await this.repository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription');
    }
    await this.deletePendingOrThrow(subscription);
    this.events.emit('subscription.rejected', {
      subscriptionId: subscription.id,
      libraryId: subscription.libraryId,
      byAdminId: admin.profileId,
    });
  }

  private async deletePendingOrThrow(subscription: SubscriptionDetails): Promise<void> {
    if (subscription.activatedAt !== null) {
      throw new ConflictError('Only pending subscription requests can be removed', 'SUBSCRIPTION_NOT_PENDING');
    }
    if (!(await this.repository.deletePending(subscription.id))) {
      throw new ConflictError('Subscription was activated in the meantime', 'SUBSCRIPTION_NOT_PENDING');
    }
  }

  private present(actor: AuthContext, subscription: SubscriptionDetails, now: Date): SubscriptionView {
    return actor.role === 'ADMIN'
      ? presentSubscriptionForAdmin(subscription, now)
      : presentSubscription(subscription, now);
  }
}
