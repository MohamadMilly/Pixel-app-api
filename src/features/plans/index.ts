import type { PrismaClient } from '../../generated/prisma/client.js';
import { domainEvents } from '../../shared/events/domain-events.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { PlansController } from './plans.controller.js';
import { PrismaPlansRepository } from './plans.repository.js';
import { createPlansRouter } from './plans.routes.js';
import { PlansService } from './plans.service.js';

export function createPlansFeature(db: PrismaClient): FeatureModule {
  const service = new PlansService(new PrismaPlansRepository(db), domainEvents);
  return { basePath: '/plans', router: createPlansRouter(new PlansController(service)) };
}
