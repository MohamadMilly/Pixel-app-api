import type { Plan, PrismaClient } from '../../generated/prisma/client.js';
import { safeAccountArgs, type SafeAccount } from '../../shared/auth/index.js';
import { activeSubscriptionWhere } from '../../shared/domain/subscription.rules.js';
import {
  accountWithCredentialsArgs,
  type AccountWithCredentials,
  type NewAccountData,
  type NewLibraryData,
} from './auth.entity.js';

export interface AuthRepository {
  findByUsernameWithCredentials(username: string): Promise<AccountWithCredentials | null>;
  usernameExists(username: string): Promise<boolean>;
  findActivePlan(planId: number): Promise<Plan | null>;
  createUserAccount(data: NewAccountData): Promise<SafeAccount>;
  createLibraryAccount(data: NewLibraryData): Promise<SafeAccount>;
  libraryHasActiveSubscription(libraryId: number, now: Date): Promise<boolean>;
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  findByUsernameWithCredentials(username: string): Promise<AccountWithCredentials | null> {
    return this.db.userAccount.findUnique({ where: { username }, ...accountWithCredentialsArgs });
  }

  async usernameExists(username: string): Promise<boolean> {
    const found = await this.db.userAccount.findUnique({ where: { username }, select: { id: true } });
    return found !== null;
  }

  findActivePlan(planId: number): Promise<Plan | null> {
    return this.db.plan.findFirst({ where: { id: planId, isActive: true } });
  }

  createUserAccount(data: NewAccountData): Promise<SafeAccount> {
    return this.db.userAccount.create({
      data: {
        username: data.username,
        password: data.passwordHash,
        firstname: data.firstname ?? null,
        lastname: data.lastname ?? null,
        role: 'USER',
        user: { create: {} },
      },
      ...safeAccountArgs,
    });
  }

  /** Account + Library + pending Subscription are created in one atomic nested write. */
  createLibraryAccount(data: NewLibraryData): Promise<SafeAccount> {
    return this.db.userAccount.create({
      data: {
        username: data.username,
        password: data.passwordHash,
        firstname: data.firstname ?? null,
        lastname: data.lastname ?? null,
        role: 'LIBRARY',
        library: {
          create: {
            title: data.title,
            location: data.location,
            latitude: data.latitude,
            longitude: data.longitude,
            pagePrice: data.pagePrice,
            extraFees: data.extraFees,
            subscriptions: {
              create: {
                planId: data.plan.id,
                durationDays: data.plan.durationDays,
              },
            },
          },
        },
      },
      ...safeAccountArgs,
    });
  }

  async libraryHasActiveSubscription(libraryId: number, now: Date): Promise<boolean> {
    const found = await this.db.subscription.findFirst({
      where: { libraryId, ...activeSubscriptionWhere(now) },
      select: { id: true },
    });
    return found !== null;
  }
}
