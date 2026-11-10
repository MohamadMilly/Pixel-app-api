import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Single source of truth for "subscription is active right now".
 * Used by authentication (library access) and by every user-facing library list.
 */
export function activeSubscriptionWhere(now: Date): Prisma.SubscriptionWhereInput {
  return {
    activatedAt: { not: null, lte: now },
    expiresAt: { gt: now },
  };
}

/** Library filter: only libraries that currently hold an active subscription and an ACTIVE account. */
export function visibleLibraryWhere(now: Date): Prisma.LibraryWhereInput {
  return {
    account: { status: 'ACTIVE' },
    subscriptions: { some: activeSubscriptionWhere(now) },
  };
}
