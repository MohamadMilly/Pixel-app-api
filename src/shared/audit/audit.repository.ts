import type { Prisma, PrismaClient, UserRole } from '../../generated/prisma/client.js';
import { idCursorArgs, orderByWithTiebreaker } from '../pagination/cursor-pagination.js';
import type { SortOrder } from '../../types/api.types.js';
import type { AuditEntryInput } from './audit.types.js';

export type AuditLogRow = {
  id: number;
  action: string;
  actorAccountId: number | null;
  actorRole: UserRole | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Prisma.JsonValue | null;
  ip: string | null;
  createdAt: Date;
};

export interface AuditLogFilter {
  readonly action: string | undefined;
  readonly actorAccountId: number | undefined;
  readonly targetType: string | undefined;
  readonly targetId: string | undefined;
  readonly from: Date | undefined;
  readonly to: Date | undefined;
}

export interface AuditListArgs {
  readonly filter: AuditLogFilter;
  readonly cursor: number | undefined;
  readonly limit: number;
  readonly sortOrder: SortOrder;
}

export interface AuditRepository {
  create(entry: AuditEntryInput): Promise<void>;
  list(args: AuditListArgs): Promise<AuditLogRow[]>;
}

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(entry: AuditEntryInput): Promise<void> {
    await this.db.auditLog.create({
      data: {
        action: entry.action,
        actorAccountId: entry.actorAccountId ?? null,
        actorRole: entry.actorRole ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId === undefined ? null : String(entry.targetId),
        metadata: entry.metadata ?? undefined,
        ip: entry.ip ?? null,
      },
    });
  }

  list(args: AuditListArgs): Promise<AuditLogRow[]> {
    return this.db.auditLog.findMany({
      where: buildWhere(args.filter),
      orderBy: orderByWithTiebreaker('createdAt', args.sortOrder),
      ...idCursorArgs(args.cursor, args.limit),
    });
  }
}

function buildWhere(filter: AuditLogFilter): Prisma.AuditLogWhereInput {
  return {
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.actorAccountId === undefined ? {} : { actorAccountId: filter.actorAccountId }),
    ...(filter.targetType ? { targetType: filter.targetType } : {}),
    ...(filter.targetId ? { targetId: filter.targetId } : {}),
    ...(filter.from || filter.to
      ? {
          createdAt: {
            ...(filter.from ? { gte: filter.from } : {}),
            ...(filter.to ? { lte: filter.to } : {}),
          },
        }
      : {}),
  };
}
