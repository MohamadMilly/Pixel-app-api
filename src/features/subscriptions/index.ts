import type { PrismaClient } from '../../generated/prisma/client.js';
import { domainEvents } from '../../shared/events/domain-events.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { PrismaSubscriptionsRepository } from './subscriptions.repository.js';
import { createSubscriptionsRouter } from './subscriptions.routes.js';
import { SubscriptionsService } from './subscriptions.service.js';

export function createSubscriptionsFeature(db: PrismaClient): FeatureModule {
  const service = new SubscriptionsService(PrismaSubscriptionsRepository.create(db), domainEvents);
  return { basePath: '/subscriptions', router: createSubscriptionsRouter(new SubscriptionsController(service)) };
}
