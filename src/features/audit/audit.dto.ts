import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination/cursor-pagination.js';
import type { AuditLogRow } from '../../shared/audit/index.js';

export const listAuditLogsQuery = paginationQuerySchema
  .omit({ sortOrder: true })
  .extend({
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    action: z.string().trim().min(1).max(100).optional(),
    actorAccountId: z.coerce.number().int().positive().optional(),
    targetType: z.string().trim().min(1).max(60).optional(),
    targetId: z.string().trim().min(1).max(60).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((q) => q.from === undefined || q.to === undefined || q.from <= q.to, {
    message: 'from must be before to',
    path: ['from'],
  });
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuery>;

export interface AuditLogView {
  readonly id: number;
  readonly action: string;
  readonly actorAccountId: number | null;
  readonly actorRole: string | null;
  readonly targetType: string | null;
  readonly targetId: string | null;
  readonly metadata: unknown;
  readonly ip: string | null;
  readonly createdAt: Date;
}

export function presentAuditLog(row: AuditLogRow): AuditLogView {
  return {
    id: row.id,
    action: row.action,
    actorAccountId: row.actorAccountId,
    actorRole: row.actorRole,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata: row.metadata,
    ip: row.ip,
    createdAt: row.createdAt,
  };
}
