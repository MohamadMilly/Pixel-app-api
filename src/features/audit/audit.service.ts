import type { AdminAuthContext } from '../../shared/auth/index.js';
import type { AuditRepository } from '../../shared/audit/index.js';
import { buildPage, mapPage } from '../../shared/pagination/cursor-pagination.js';
import type { Paginated } from '../../types/api.types.js';
import { presentAuditLog, type AuditLogView, type ListAuditLogsQuery } from './audit.dto.js';

/** Read-only admin access to the audit trail (writes happen via the event subscriber). */
export class AuditQueryService {
  constructor(private readonly repository: AuditRepository) {}

  async list(_admin: AdminAuthContext, query: ListAuditLogsQuery): Promise<Paginated<AuditLogView>> {
    const rows = await this.repository.list({
      filter: {
        action: query.action,
        actorAccountId: query.actorAccountId,
        targetType: query.targetType,
        targetId: query.targetId,
        from: query.from,
        to: query.to,
      },
      cursor: query.cursor,
      limit: query.limit,
      sortOrder: query.sortOrder,
    });
    return mapPage(buildPage(rows, query.limit, (row) => row.id), presentAuditLog);
  }
}
