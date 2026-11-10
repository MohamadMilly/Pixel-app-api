import type { PrismaClient } from '../../generated/prisma/client.js';
import { domainEvents } from '../../shared/events/domain-events.js';
import type { FeatureModule } from '../../shared/http/feature-module.js';
import { AuthController } from './auth.controller.js';
import { PrismaAuthRepository } from './auth.repository.js';
import { createAuthRouter } from './auth.routes.js';
import { AuthService } from './auth.service.js';
import { PrismaRefreshTokenRepository } from './refresh-token.repository.js';

/** Composition root of the auth slice. */
export function createAuthFeature(db: PrismaClient): FeatureModule {
  const service = new AuthService(
    new PrismaAuthRepository(db),
    new PrismaRefreshTokenRepository(db),
    domainEvents,
  );
  return { basePath: '/auth', router: createAuthRouter(new AuthController(service)) };
}
