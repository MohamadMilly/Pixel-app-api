import type { PrismaClient } from '../../generated/prisma/client.js';
import { domainEvents } from '../../shared/events/domain-events.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { getStorage } from '../../shared/storage/index.js';
import { BooksController } from './books.controller.js';
import { PrismaBooksRepository } from './books.repository.js';
import { createBooksRouter } from './books.routes.js';
import { BooksService } from './books.service.js';

export function createBooksFeature(db: PrismaClient): FeatureModule {
  const service = new BooksService(new PrismaBooksRepository(db), getStorage(), domainEvents);
  return { basePath: '/books', router: createBooksRouter(new BooksController(service)) };
}
