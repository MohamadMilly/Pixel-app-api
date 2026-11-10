import type { PrismaClient } from '../../generated/prisma/client.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { getStorage } from '../../shared/storage/index.js';
import { virusScanner } from '../../shared/security/virus-scan.js';
import { FilesController } from './files.controller.js';
import { PrismaFilesRepository } from './files.repository.js';
import { createFilesRouter } from './files.routes.js';
import { FilesService } from './files.service.js';

export function createFilesFeature(db: PrismaClient): FeatureModule {
  const service = new FilesService(new PrismaFilesRepository(db), getStorage(), virusScanner);
  return { basePath: '/files', router: createFilesRouter(new FilesController(service)) };
}
