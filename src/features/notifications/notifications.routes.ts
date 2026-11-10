import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P } from '../../shared/rbac/permissions.js';
import type { NotificationsController } from './notifications.controller.js';

export function createNotificationsRouter(controller: NotificationsController): Router {
  const router = Router();
  // Any authenticated role may read ITS OWN notifications (scoped by account in the service).
  const owner = guard({ roles: ['USER', 'LIBRARY', 'ADMIN'], permissions: [P.NOTIFICATION_READ] });

  router.get('/', ...owner, controller.list);
  router.get('/unread-count', ...owner, controller.unreadCount);
  router.post('/read-all', ...owner, controller.markAllRead);
  router.patch('/:id/read', ...owner, controller.markRead);

  return router;
}
