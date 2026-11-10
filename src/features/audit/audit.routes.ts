import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P } from '../../shared/rbac/permissions.js';
import type { AuditController } from './audit.controller.js';

/** Audit trail is readable by admins only. */
export function createAuditRouter(controller: AuditController): Router {
  const router = Router();
  router.get('/', ...guard({ roles: ['ADMIN'], permissions: [P.AUDIT_READ] }), controller.list);
  return router;
}
