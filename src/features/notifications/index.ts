import type { FeatureModule } from '../../shared/http/feature-module.js';
import { notificationRepository } from '../../shared/notifications/index.js';
import { NotificationsController } from './notifications.controller.js';
import { createNotificationsRouter } from './notifications.routes.js';
import { NotificationsService } from './notifications.service.js';

export function createNotificationsFeature(): FeatureModule {
  const service = new NotificationsService(notificationRepository);
  return { basePath: '/notifications', router: createNotificationsRouter(new NotificationsController(service)) };
}
