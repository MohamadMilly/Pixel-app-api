import type { Plan, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { activeSubscriptionWhere } from '../../shared/domain/subscription.rules.js';
import { idCursorArgs, orderByWithTiebreaker } from '../../shared/pagination/cursor-pagination.js';
import type { SortOrder } from '../../types/api.types.js';
import {
  subscriptionDetailsArgs,
  type RequestablePlan,
  type SubscriptionActivationData,
  type SubscriptionDetails,
  type SubscriptionListFilter,
  type SubscriptionSortField,
  type SubscriptionStatus,
} from './subscriptions.entity.js';

export interface SubscriptionListArgs {
  readonly filter: SubscriptionListFilter;
  readonly cursor: number | undefined;
  readonly limit: number;
  readonly sortBy: SubscriptionSortField;
  readonly sortOrder: SortOrder;
}

export interface SubscriptionsRepository {
  list(args: SubscriptionListArgs): Promise<SubscriptionDetails[]>;
  findById(id: number): Promise<SubscriptionDetails | null>;
  findActivePlan(planId: number): Promise<Plan | null>;
  hasPendingRequest(libraryId: number): Promise<boolean>;
  createPending(libraryId: number, plan: RequestablePlan): Promise<SubscriptionDetails>;
  /** Latest `expiresAt` among the library's activated subscriptions that end after `after`. */
  findLatestExpiry(libraryId: number, after: Date): Promise<Date | null>;
  /** Conditional update: only succeeds if the subscription is still pending. */
  markActivated(id: number, data: SubscriptionActivationData): Promise<boolean>;
  /** Conditional delete: only succeeds if the subscription is still pending. */
  deletePending(id: number): Promise<boolean>;
  /** Run `work` in a SERIALIZABLE transaction with a repository bound to it. */
  transaction<T>(work: (repository: SubscriptionsRepository) => Promise<T>): Promise<T>;
}

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaSubscriptionsRepository implements SubscriptionsRepository {
  /** `root` is only set on the top-level instance; transactional instances cannot nest. */
  constructor(
    private readonly db: DbClient,
    private readonly root: PrismaClient | null = null,
  ) {}

  static create(db: PrismaClient): PrismaSubscriptionsRepository {
    return new PrismaSubscriptionsRepository(db, db);
  }

  list(args: SubscriptionListArgs): Promise<SubscriptionDetails[]> {
    return this.db.subscription.findMany({
      where: buildWhere(args.filter),
      orderBy: orderByWithTiebreaker(args.sortBy, args.sortOrder),
      ...idCursorArgs(args.cursor, args.limit),
      ...subscriptionDetailsArgs,
    });
  }

  findById(id: number): Promise<SubscriptionDetails | null> {
    return this.db.subscription.findUnique({ where: { id }, ...subscriptionDetailsArgs });
  }

  findActivePlan(planId: number): Promise<Plan | null> {
    return this.db.plan.findFirst({ where: { id: planId, isActive: true } });
  }

  async hasPendingRequest(libraryId: number): Promise<boolean> {
    const found = await this.db.subscription.findFirst({
      where: { libraryId, activatedAt: null },
      select: { id: true },
    });
    return found !== null;
  }

  createPending(libraryId: number, plan: RequestablePlan): Promise<SubscriptionDetails> {
    return this.db.subscription.create({
      data: { libraryId, planId: plan.id, durationDays: plan.durationDays },
      ...subscriptionDetailsArgs,
    });
  }

  async findLatestExpiry(libraryId: number, after: Date): Promise<Date | null> {
    const result = await this.db.subscription.aggregate({
      where: { libraryId, activatedAt: { not: null }, expiresAt: { gt: after } },
      _max: { expiresAt: true },
    });
    return result._max.expiresAt;
  }

  async markActivated(id: number, data: SubscriptionActivationData): Promise<boolean> {
    const { count } = await this.db.subscription.updateMany({
      where: { id, activatedAt: null },
      data: {
        activatedAt: data.activatedAt,
        expiresAt: data.expiresAt,
        activatedByAdminId: data.activatedByAdminId,
      },
    });
    return count === 1;
  }

  async deletePending(id: number): Promise<boolean> {
    const { count } = await this.db.subscription.deleteMany({ where: { id, activatedAt: null } });
    return count === 1;
  }

  transaction<T>(work: (repository: SubscriptionsRepository) => Promise<T>): Promise<T> {
    if (!this.root) {
      return work(this); // already inside a transaction
    }
    return this.root.$transaction((tx) => work(new PrismaSubscriptionsRepository(tx)), {
      isolationLevel: 'Serializable',
    });
  }
}

function buildWhere(filter: SubscriptionListFilter): Prisma.SubscriptionWhereInput {
  return {
    ...(filter.libraryId === undefined ? {} : { libraryId: filter.libraryId }),
    ...(filter.planId === undefined ? {} : { planId: filter.planId }),
    ...(filter.status === undefined ? {} : statusWhere(filter.status, filter.now)),
  };
}

function statusWhere(status: SubscriptionStatus, now: Date): Prisma.SubscriptionWhereInput {
  switch (status) {
    case 'PENDING':
      return { activatedAt: null };
    case 'SCHEDULED':
      return { activatedAt: { gt: now } };
    case 'ACTIVE':
      return activeSubscriptionWhere(now);
    case 'EXPIRED':
      return { expiresAt: { lte: now } };
  }
}
