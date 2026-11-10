import { PrismaPg } from '@prisma/adapter-pg';
import { env, isProduction } from '../../config/env.js';
import { PrismaClient } from '../../generated/prisma/client.js';

// Prisma 7 requires a driver adapter; @prisma/adapter-pg uses node-postgres under the hood.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: isProduction ? ['error'] : ['warn', 'error'],
});

export type Database = typeof prisma;
