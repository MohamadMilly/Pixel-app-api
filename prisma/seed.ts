/**
 * Seed: first admin account + default subscription plans.
 * Run with `npm run db:seed` (configured in prisma.config.ts). Safe to run repeatedly.
 */
import { prisma } from '../src/shared/database/prisma.js';
import { hashPassword } from '../src/shared/security/password.js';

const DEFAULT_PLANS = [
  { name: 'Monthly', description: '30 days of visibility on the platform', durationDays: 30, price: 10_000 },
  { name: 'Quarterly', description: '90 days of visibility on the platform', durationDays: 90, price: 27_000 },
  { name: 'Yearly', description: '365 days of visibility on the platform', durationDays: 365, price: 100_000 },
] as const;

async function seedAdmin(): Promise<void> {
  const username = process.env['SEED_ADMIN_USERNAME'];
  const password = process.env['SEED_ADMIN_PASSWORD'];
  if (!username || !password) {
    console.warn('⚠️  SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD not set — skipping admin seed');
    return;
  }

  const existing = await prisma.userAccount.findUnique({ where: { username }, select: { id: true } });
  if (existing) {
    console.log(`✔ Admin "${username}" already exists`);
    return;
  }

  await prisma.userAccount.create({
    data: {
      username,
      password: await hashPassword(password),
      role: 'ADMIN',
      firstname: 'System',
      lastname: 'Admin',
      admin: { create: {} },
    },
  });
  console.log(`✔ Admin "${username}" created`);
}

async function seedPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    await prisma.plan.upsert({ where: { name: plan.name }, update: {}, create: plan });
  }
  console.log(`✔ ${DEFAULT_PLANS.length} plans ensured`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedPlans();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
