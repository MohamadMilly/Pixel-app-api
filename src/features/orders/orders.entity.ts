import type { BookPrintOrderStatus, Prisma } from '../../generated/prisma/client.js';

export const orderDetailArgs = {
  include: {
    book: { select: { id: true, title: true, pages: true } },
    // accountId on both parties lets the service notify the counterparty on status changes.
    library: { select: { id: true, title: true, accountId: true } },
    sender: { select: { accountId: true } },
  },
} satisfies Prisma.BookPrintOrderDefaultArgs;

export type OrderDetails = Prisma.BookPrintOrderGetPayload<typeof orderDetailArgs>;

export const ORDER_SORT_FIELDS = ['id', 'sentAt', 'status'] as const;
export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];

export interface OrderListFilter {
  readonly senderId: number | undefined;
  readonly libraryId: number | undefined;
  readonly status: BookPrintOrderStatus | undefined;
  readonly bookId: number | undefined;
}

/* ───────────────────────── State machine (pure) ───────────────────────── */

export type OrderStatus = BookPrintOrderStatus;

export type OrderAction = 'accept' | 'reject' | 'fulfill' | 'cancel' | 'receive';

/** Who is allowed to trigger each action (ownership is checked separately in the policy). */
export const ORDER_ACTION_ROLE: Readonly<Record<OrderAction, 'USER' | 'LIBRARY'>> = {
  cancel: 'USER',
  receive: 'USER',
  accept: 'LIBRARY',
  reject: 'LIBRARY',
  fulfill: 'LIBRARY',
};

/** Allowed transitions: action → { from: required current status, to: next status }. */
const TRANSITIONS: Readonly<Record<OrderAction, { from: readonly OrderStatus[]; to: OrderStatus }>> = {
  accept: { from: ['PENDING'], to: 'ACCEPTED' },
  reject: { from: ['PENDING'], to: 'REJECTED' },
  cancel: { from: ['PENDING', 'ACCEPTED'], to: 'CANCELLED' },
  fulfill: { from: ['ACCEPTED'], to: 'FULFILLED' },
  receive: { from: ['FULFILLED'], to: 'RECEIVED' },
};

export function transitionFor(action: OrderAction): { from: readonly OrderStatus[]; to: OrderStatus } {
  return TRANSITIONS[action];
}

export function canTransition(action: OrderAction, current: OrderStatus): boolean {
  return TRANSITIONS[action].from.includes(current);
}

/* ───────────────────────── Pricing (pure) ───────────────────────── */

export interface PriceSnapshot {
  readonly pageCount: number;
  readonly snapshotPagePrice: number;
  readonly snapshotExtraFees: number;
  readonly totalPrice: number;
}

/** Flat per-library pricing, frozen onto the order at creation. */
export function computePriceSnapshot(pages: number, pagePrice: number, extraFees: number): PriceSnapshot {
  return {
    pageCount: pages,
    snapshotPagePrice: pagePrice,
    snapshotExtraFees: extraFees,
    totalPrice: pages * pagePrice + extraFees,
  };
}
