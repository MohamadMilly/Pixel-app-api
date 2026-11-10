import { auditRepository, initAudit } from '../../shared/audit/index.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { AuditController } from './audit.controller.js';
import { createAuditRouter } from './audit.routes.js';
import { AuditQueryService } from './audit.service.js';

export function createAuditFeature(): FeatureModule {
  // Wire the write-side (event → audit row) exactly once, when the slice is mounted.
  initAudit();
  const service = new AuditQueryService(auditRepository);
  return { basePath: '/audit-logs', router: createAuditRouter(new AuditController(service)) };
}
