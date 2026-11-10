import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P } from '../../shared/rbac/permissions.js';
import type { SubscriptionsController } from './subscriptions.controller.js';

export function createSubscriptionsRouter(controller: SubscriptionsController): Router {
  const router = Router();

  // Admins read all, libraries read their own (scoped in the service). Inactive libraries
  // must be able to see their pending request, hence allowInactiveLibrary.
  const readers = guard({
    roles: ['ADMIN', 'LIBRARY'],
    anyOf: [P.SUBSCRIPTION_READ_ANY, P.SUBSCRIPTION_READ_OWN],
    allowInactiveLibrary: true,
  });

  router.get('/', ...readers, controller.list);
  router.get('/:subscriptionId', ...readers, controller.getById);

  // Library-only
  router.post(
    '/',
    ...guard({ roles: ['LIBRARY'], permissions: [P.SUBSCRIPTION_REQUEST], allowInactiveLibrary: true }),
    controller.request,
  );
  router.delete(
    '/:subscriptionId',
    ...guard({ roles: ['LIBRARY'], permissions: [P.SUBSCRIPTION_CANCEL_OWN], allowInactiveLibrary: true }),
    controller.cancel,
  );

  // Admin-only
  router.patch(
    '/:subscriptionId/activate',
    ...guard({ roles: ['ADMIN'], permissions: [P.SUBSCRIPTION_ACTIVATE] }),
    controller.activate,
  );
  router.patch(
    '/:subscriptionId/reject',
    ...guard({ roles: ['ADMIN'], permissions: [P.SUBSCRIPTION_REJECT] }),
    controller.reject,
  );

  return router;
}
