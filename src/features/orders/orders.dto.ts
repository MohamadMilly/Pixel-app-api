import { z } from 'zod';
import { BookPrintOrderStatus } from '../../generated/prisma/client.js';
import { paginationQuerySchema, sortBySchema } from '../../shared/pagination/cursor-pagination.js';
import { idParamsSchema } from '../../shared/validation/parse-input.js';
import { ORDER_SORT_FIELDS, type OrderDetails } from './orders.entity.js';

export const libraryIdParams = idParamsSchema('libraryId');
export const orderIdParams = idParamsSchema('orderId');

export const createOrderDto = z.strictObject({
  bookId: z.number().int().positive(),
});
export type CreateOrderDto = z.infer<typeof createOrderDto>;

export const listReceivedBooksQuery = paginationQuerySchema.pick({ cursor: true, limit: true, sortOrder: true });
export type ListReceivedBooksQuery = z.infer<typeof listReceivedBooksQuery>;

export interface ReceivedBookView {
  readonly id: number;
  readonly title: string;
  readonly pages: number;
  readonly thumbnailUrl: string | null;
  readonly avgRating: number;
  readonly ratingCount: number;
}

export const listOrdersQuery = paginationQuerySchema.extend({
  sortBy: sortBySchema(ORDER_SORT_FIELDS, 'sentAt'),
  status: z.enum(BookPrintOrderStatus).optional(),
  bookId: z.coerce.number().int().positive().optional(),
  /** Admin-only filters; scoped away for USER/LIBRARY in the policy. */
  libraryId: z.coerce.number().int().positive().optional(),
  senderId: z.coerce.number().int().positive().optional(),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;

export interface OrderView {
  readonly id: number;
  readonly status: string;
  readonly book: { readonly id: number; readonly title: string; readonly pages: number };
  readonly library: { readonly id: number; readonly title: string };
  readonly senderId: number;
  readonly price: {
    readonly pageCount: number;
    readonly pagePrice: number;
    readonly extraFees: number;
    readonly total: number;
  };
  readonly sentAt: Date;
}

export function presentOrder(order: OrderDetails): OrderView {
  return {
    id: order.id,
    status: order.status,
    book: order.book,
    library: order.library,
    senderId: order.senderId,
    price: {
      pageCount: order.pageCount,
      pagePrice: order.snapshotPagePrice,
      extraFees: order.snapshotExtraFees,
      total: order.totalPrice,
    },
    sentAt: order.sentAt,
  };
}
