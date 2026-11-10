import { prisma } from '../database/prisma.js';
import { realtime } from '../realtime/index.js';
import { PrismaNotificationRepository } from './notification.repository.js';
import { NotificationService } from './notification.service.js';

export type { NotificationRecord, CreateNotificationInput } from './notification.types.js';
export { NOTIFICATION_EVENT } from './notification.types.js';
export type { NotificationRepository } from './notification.repository.js';
export { NotificationService } from './notification.service.js';

export const notificationRepository = new PrismaNotificationRepository(prisma);
export const notificationService = new NotificationService(notificationRepository, realtime);
