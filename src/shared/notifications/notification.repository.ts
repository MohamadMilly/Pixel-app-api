import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { idCursorArgs, orderByWithTiebreaker } from '../pagination/cursor-pagination.js';
import type { SortOrder } from '../../types/api.types.js';
import type { CreateNotificationInput, NotificationRecord } from './notification.types.js';

const select = {
  id: true,
  accountId: true,
  content: true,
  type: true,
  orderId: true,
  createdAt: true,
  readAt: true,
} as const;

export interface NotificationListArgs {
  readonly accountId: number;
  readonly unreadOnly: boolean;
  readonly cursor: number | undefined;
  readonly limit: number;
  readonly sortOrder: SortOrder;
}

/**
 * Shared notification data access. Lives in `shared/` because several features
 * (orders now, more later) create notifications — a feature must not import another
 * feature's repository, so this cross-cutting query belongs here.
 */
export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationRecord>;
  list(args: NotificationListArgs): Promise<NotificationRecord[]>;
  /** Mark one notification read, only if it belongs to the account. Returns false otherwise. */
  markRead(id: number, accountId: number): Promise<boolean>;
  markAllRead(accountId: number): Promise<number>;
  unreadCount(accountId: number): Promise<number>;
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  create(input: CreateNotificationInput): Promise<NotificationRecord> {
    return this.db.notification.create({
      data: {
        accountId: input.accountId,
        content: input.content,
        type: input.type ?? null,
        orderId: input.orderId ?? null,
      },
      select,
    });
  }

  list(args: NotificationListArgs): Promise<NotificationRecord[]> {
    const where: Prisma.NotificationWhereInput = {
      accountId: args.accountId,
      ...(args.unreadOnly ? { readAt: null } : {}),
    };
    return this.db.notification.findMany({
      where,
      orderBy: orderByWithTiebreaker('createdAt', args.sortOrder),
      ...idCursorArgs(args.cursor, args.limit),
      select,
    });
  }

  async markRead(id: number, accountId: number): Promise<boolean> {
    const { count } = await this.db.notification.updateMany({
      where: { id, accountId, readAt: null },
      data: { readAt: new Date() },
    });
    return count === 1;
  }

  async markAllRead(accountId: number): Promise<number> {
    const { count } = await this.db.notification.updateMany({
      where: { accountId, readAt: null },
      data: { readAt: new Date() },
    });
    return count;
  }

  unreadCount(accountId: number): Promise<number> {
    return this.db.notification.count({ where: { accountId, readAt: null } });
  }
}
