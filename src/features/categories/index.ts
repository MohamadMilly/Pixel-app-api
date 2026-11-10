import type { PrismaClient } from '../../generated/prisma/client.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { CategoriesController } from './categories.controller.js';
import { PrismaCategoriesRepository } from './categories.repository.js';
import { createCategoriesRouter } from './categories.routes.js';
import { CategoriesService } from './categories.service.js';

export function createCategoriesFeature(db: PrismaClient): FeatureModule {
  const service = new CategoriesService(new PrismaCategoriesRepository(db));
  return { basePath: '/categories', router: createCategoriesRouter(new CategoriesController(service)) };
}
