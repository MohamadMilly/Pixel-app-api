import type { Plan, Prisma } from '../../generated/prisma/client.js';

export const subscriptionDetailsArgs = {
  include: {
    plan: { select: { id: true, name: true, price: true } },
    library: { select: { id: true, title: true } },
  },
} satisfies Prisma.SubscriptionDefaultArgs;

export type SubscriptionDetails = Prisma.SubscriptionGetPayload<typeof subscriptionDetailsArgs>;

/**
 * Derived lifecycle (not stored):
 *  PENDING   → requested, not yet activated by an admin
 *  SCHEDULED → activated, but starts after the library's current subscription ends (renewal)
 *  ACTIVE    → activatedAt ≤ now < expiresAt
 *  EXPIRED   → expiresAt ≤ now
 */
export const SubscriptionStatus = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
export const SUBSCRIPTION_STATUSES = Object.values(SubscriptionStatus) as [
  SubscriptionStatus,
  ...SubscriptionStatus[],
];

export function deriveSubscriptionStatus(
  subscription: { readonly activatedAt: Date | null; readonly expiresAt: Date | null },
  now: Date,
): SubscriptionStatus {
  const { activatedAt, expiresAt } = subscription;
  if (!activatedAt || !expiresAt) return SubscriptionStatus.PENDING;
  if (expiresAt.getTime() <= now.getTime()) return SubscriptionStatus.EXPIRED;
  if (activatedAt.getTime() > now.getTime()) return SubscriptionStatus.SCHEDULED;
  return SubscriptionStatus.ACTIVE;
}

export const SUBSCRIPTION_SORT_FIELDS = ['id', 'requestedAt', 'activatedAt', 'expiresAt'] as const;
export type SubscriptionSortField = (typeof SUBSCRIPTION_SORT_FIELDS)[number];

export interface SubscriptionListFilter {
  /** Always set for library actors (ownership scope). Optional filter for admins. */
  readonly libraryId: number | undefined;
  readonly planId: number | undefined;
  readonly status: SubscriptionStatus | undefined;
  readonly now: Date;
}

export interface SubscriptionActivationData {
  readonly activatedAt: Date;
  readonly expiresAt: Date;
  readonly activatedByAdminId: number;
}

export type RequestablePlan = Pick<Plan, 'id' | 'durationDays'>;
