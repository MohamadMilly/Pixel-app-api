import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P } from '../../shared/rbac/permissions.js';
import type { AccountsController } from './accounts.controller.js';

/** Every route in this slice is ADMIN-only. */
export function createAccountsRouter(controller: AccountsController): Router {
  const router = Router();

  const adminRead = guard({ roles: ['ADMIN'], permissions: [P.ACCOUNT_READ] });
  const adminBan = guard({ roles: ['ADMIN'], permissions: [P.ACCOUNT_BAN] });

  router.get('/', ...adminRead, controller.list);
  router.get('/:accountId', ...adminRead, controller.getById);
  router.patch('/:accountId/ban', ...adminBan, controller.ban);
  router.patch('/:accountId/unban', ...adminBan, controller.unban);

  return router;
}
