import type { PrismaClient } from '../../generated/prisma/client.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { LibrariesController } from './libraries.controller.js';
import { PrismaLibrariesRepository } from './libraries.repository.js';
import { createLibrariesRouter } from './libraries.routes.js';
import { LibrariesService } from './libraries.service.js';

export function createLibrariesFeature(db: PrismaClient): FeatureModule {
  const service = new LibrariesService(new PrismaLibrariesRepository(db));
  return { basePath: '/libraries', router: createLibrariesRouter(new LibrariesController(service)) };
}
