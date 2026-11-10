import type { PrismaClient } from '../../generated/prisma/client.js';
import { domainEvents } from '../../shared/events/domain-events.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { notificationService } from '../../shared/notifications/index.js';
import { OrdersController } from './orders.controller.js';
import { PrismaOrdersRepository } from './orders.repository.js';
import { createOrdersRouter } from './orders.routes.js';
import { OrdersService } from './orders.service.js';

export function createOrdersFeature(db: PrismaClient): FeatureModule {
  const service = new OrdersService(new PrismaOrdersRepository(db), domainEvents, notificationService);
  // Mounted at root so it can serve both /libraries/:libraryId/orders and /orders/*.
  return { basePath: '/', router: createOrdersRouter(new OrdersController(service)) };
}
