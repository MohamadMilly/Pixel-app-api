import { prisma } from '../database/prisma.js';
import { PrismaAuthContextRepository } from './auth-context.repository.js';
import { AuthContextService } from './auth-context.service.js';

export * from './auth-context.types.js';
export * from './request-auth.js';
export { assertAccountIsActive, AuthContextService } from './auth-context.service.js';

/** Composition root for the shared auth context (used by HTTP + realtime). */
export const authContextService = new AuthContextService(new PrismaAuthContextRepository(prisma));
