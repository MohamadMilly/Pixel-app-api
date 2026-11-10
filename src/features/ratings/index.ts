import type { PrismaClient } from '../../generated/prisma/client.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { RatingsController } from './ratings.controller.js';
import { PrismaRatingsRepository } from './ratings.repository.js';
import { createRatingsRouter } from './ratings.routes.js';
import { RatingsService } from './ratings.service.js';

export function createRatingsFeature(db: PrismaClient): FeatureModule {
  const service = new RatingsService(new PrismaRatingsRepository(db));
  return { basePath: '/', router: createRatingsRouter(new RatingsController(service)) };
}
