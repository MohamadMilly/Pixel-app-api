import { Router } from 'express';
import { createAccountsFeature } from '../features/accounts/index.js';
import { createAuditFeature } from '../features/audit/index.js';
import { createAuthFeature } from '../features/auth/index.js';
import { createBooksFeature } from '../features/books/index.js';
import { createCategoriesFeature } from '../features/categories/index.js';
import { createFilesFeature } from '../features/files/index.js';
import { createNotificationsFeature } from '../features/notifications/index.js';
import { createOrdersFeature } from '../features/orders/index.js';
import { createRatingsFeature } from '../features/ratings/index.js';
import { createLibrariesFeature } from '../features/libraries/index.js';
import { createPlansFeature } from '../features/plans/index.js';
import { createSubscriptionsFeature } from '../features/subscriptions/index.js';
import { prisma } from '../shared/database/prisma.js';
import type { FeatureModule } from '../shared/http/feature-module.js';

/**
 * Feature registry for /api/v1.
 * Each vertical slice is self-contained: add one line here when a slice is ready.
 * Slices that are not registered simply do not exist yet — nothing else breaks.
 */
const features: readonly FeatureModule[] = [
  createAuthFeature(prisma),
  createPlansFeature(prisma),
  createSubscriptionsFeature(prisma),
  createAccountsFeature(prisma),
  createLibrariesFeature(prisma),
  createAuditFeature(),
  createFilesFeature(prisma),
  createBooksFeature(prisma),
  createCategoriesFeature(prisma),
  createOrdersFeature(prisma),
  createRatingsFeature(prisma),
  createNotificationsFeature(),
];

export function createV1Router(): Router {
  const router = Router();
  for (const feature of features) {
    router.use(feature.basePath, feature.router);
  }
  return router;
}
