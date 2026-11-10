import type { PrismaClient } from '../../generated/prisma/client.js';
import { domainEvents } from '../../shared/events/domain-events.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { AccountsController } from './accounts.controller.js';
import { PrismaAccountsRepository } from './accounts.repository.js';
import { createAccountsRouter } from './accounts.routes.js';
import { AccountsService } from './accounts.service.js';

export function createAccountsFeature(db: PrismaClient): FeatureModule {
  const service = new AccountsService(new PrismaAccountsRepository(db), domainEvents);
  return { basePath: '/accounts', router: createAccountsRouter(new AccountsController(service)) };
}
