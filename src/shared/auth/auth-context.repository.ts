import type { PrismaClient } from '../../generated/prisma/client.js';
import { activeSubscriptionWhere } from '../domain/subscription.rules.js';
import { safeAccountArgs, type SafeAccount } from './auth-context.types.js';

export interface AuthContextRepository {
  findAccountById(accountId: number): Promise<SafeAccount | null>;
  libraryHasActiveSubscription(libraryId: number, now: Date): Promise<boolean>;
}

export class PrismaAuthContextRepository implements AuthContextRepository {
  constructor(private readonly db: PrismaClient) {}

  findAccountById(accountId: number): Promise<SafeAccount | null> {
    return this.db.userAccount.findUnique({ where: { id: accountId }, ...safeAccountArgs });
  }

  async libraryHasActiveSubscription(libraryId: number, now: Date): Promise<boolean> {
    const subscription = await this.db.subscription.findFirst({
      where: { libraryId, ...activeSubscriptionWhere(now) },
      select: { id: true },
    });
    return subscription !== null;
  }
}
