import { z } from 'zod';
import { paginationQuerySchema, sortBySchema } from '../../shared/pagination/cursor-pagination.js';
import { idParamsSchema } from '../../shared/validation/parse-input.js';
import {
  deriveSubscriptionStatus,
  SUBSCRIPTION_SORT_FIELDS,
  SUBSCRIPTION_STATUSES,
  type SubscriptionDetails,
  type SubscriptionStatus,
} from './subscriptions.entity.js';

/* ───────────────────────────── Input DTOs ───────────────────────────── */

export const subscriptionIdParams = idParamsSchema('subscriptionId');

export const listSubscriptionsQuery = paginationQuerySchema.extend({
  sortBy: sortBySchema(SUBSCRIPTION_SORT_FIELDS, 'requestedAt'),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  planId: z.coerce.number().int().positive().optional(),
  /** Admin-only filter. Libraries are always scoped to themselves (see service). */
  libraryId: z.coerce.number().int().positive().optional(),
});
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuery>;

/**
 * NOTE: there is intentionally NO `libraryId` in the body —
 * the requesting library is always taken from the authenticated context.
 */
export const requestSubscriptionDto = z.strictObject({
  planId: z.number().int().positive(),
});
export type RequestSubscriptionDto = z.infer<typeof requestSubscriptionDto>;

/* ──────────────────────────── Output presenters ──────────────────────────── */

export interface SubscriptionView {
  readonly id: number;
  readonly status: SubscriptionStatus;
  readonly durationDays: number;
  readonly requestedAt: Date;
  readonly activatedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly plan: { readonly id: number; readonly name: string; readonly price: number };
  readonly library: { readonly id: number; readonly title: string };
}

/** Admin view additionally exposes who activated the subscription. */
export interface AdminSubscriptionView extends SubscriptionView {
  readonly activatedByAdminId: number | null;
}

export function presentSubscription(subscription: SubscriptionDetails, now: Date): SubscriptionView {
  return {
    id: subscription.id,
    status: deriveSubscriptionStatus(subscription, now),
    durationDays: subscription.durationDays,
    requestedAt: subscription.requestedAt,
    activatedAt: subscription.activatedAt,
    expiresAt: subscription.expiresAt,
    plan: subscription.plan,
    library: subscription.library,
  };
}

export function presentSubscriptionForAdmin(subscription: SubscriptionDetails, now: Date): AdminSubscriptionView {
  return { ...presentSubscription(subscription, now), activatedByAdminId: subscription.activatedByAdminId };
}
