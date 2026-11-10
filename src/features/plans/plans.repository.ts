import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { idCursorArgs, orderByWithTiebreaker } from '../../shared/pagination/cursor-pagination.js';
import type { SortOrder } from '../../types/api.types.js';
import type {
  PlanCreateData,
  PlanEntity,
  PlanListFilter,
  PlanSortField,
  PlanUpdateData,
} from './plans.entity.js';

export interface PlanListArgs {
  readonly filter: PlanListFilter;
  readonly cursor: number | undefined;
  readonly limit: number;
  readonly sortBy: PlanSortField;
  readonly sortOrder: SortOrder;
}

export interface PlansRepository {
  /** Returns up to `limit + 1` rows (the extra row signals a next page). */
  list(args: PlanListArgs): Promise<PlanEntity[]>;
  findById(id: number): Promise<PlanEntity | null>;
  nameExists(name: string, excludeId?: number): Promise<boolean>;
  create(data: PlanCreateData): Promise<PlanEntity>;
  update(id: number, data: PlanUpdateData): Promise<PlanEntity>;
  delete(id: number): Promise<void>;
  countSubscriptions(planId: number): Promise<number>;
}

export class PrismaPlansRepository implements PlansRepository {
  constructor(private readonly db: PrismaClient) {}

  list(args: PlanListArgs): Promise<PlanEntity[]> {
    return this.db.plan.findMany({
      where: buildWhere(args.filter),
      orderBy: orderByWithTiebreaker(args.sortBy, args.sortOrder),
      ...idCursorArgs(args.cursor, args.limit),
    });
  }

  findById(id: number): Promise<PlanEntity | null> {
    return this.db.plan.findUnique({ where: { id } });
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const found = await this.db.plan.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    return found !== null;
  }

  create(data: PlanCreateData): Promise<PlanEntity> {
    return this.db.plan.create({ data });
  }

  update(id: number, data: PlanUpdateData): Promise<PlanEntity> {
    return this.db.plan.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await this.db.plan.delete({ where: { id } });
  }

  countSubscriptions(planId: number): Promise<number> {
    return this.db.subscription.count({ where: { planId } });
  }
}

function buildWhere(filter: PlanListFilter): Prisma.PlanWhereInput {
  return {
    ...(filter.isActive === undefined ? {} : { isActive: filter.isActive }),
    ...(filter.name ? { name: { contains: filter.name, mode: 'insensitive' } } : {}),
    ...(filter.minPrice !== undefined || filter.maxPrice !== undefined
      ? {
          price: {
            ...(filter.minPrice === undefined ? {} : { gte: filter.minPrice }),
            ...(filter.maxPrice === undefined ? {} : { lte: filter.maxPrice }),
          },
        }
      : {}),
  };
}
