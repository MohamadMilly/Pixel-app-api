import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P } from '../../shared/rbac/permissions.js';
import type { PlansController } from './plans.controller.js';

export function createPlansRouter(controller: PlansController): Router {
  const router = Router();

  // Libraries must see plans BEFORE activation (to request one), hence allowInactiveLibrary.
  const readers = guard({ roles: ['ADMIN', 'LIBRARY'], permissions: [P.PLAN_READ], allowInactiveLibrary: true });
  const admins = guard({ roles: ['ADMIN'], permissions: [P.PLAN_MANAGE] });

  router.get('/', ...readers, controller.list);
  router.get('/:planId', ...readers, controller.getById);
  router.post('/', ...admins, controller.create);
  router.patch('/:planId', ...admins, controller.update);
  router.delete('/:planId', ...admins, controller.delete);

  return router;
}
