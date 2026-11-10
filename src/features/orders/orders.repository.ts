import type { BookPrintOrderStatus, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { visibleLibraryWhere } from '../../shared/domain/subscription.rules.js';
import { idCursorArgs, orderByWithTiebreaker } from '../../shared/pagination/cursor-pagination.js';
import type { SortOrder } from '../../types/api.types.js';
import {
  orderDetailArgs,
  type OrderDetails,
  type OrderListFilter,
  type OrderSortField,
  type OrderStatus,
  type PriceSnapshot,
} from './orders.entity.js';

export interface OrderListArgs {
  readonly filter: OrderListFilter;
  readonly cursor: number | undefined;
  readonly limit: number;
  readonly sortBy: OrderSortField;
  readonly sortOrder: SortOrder;
}

export interface OrderableTargets {
  readonly book: { id: number; pages: number };
  readonly library: { id: number; pagePrice: number; extraFees: number };
}

export interface CreateOrderData extends PriceSnapshot {
  readonly senderId: number;
  readonly bookId: number;
  readonly libraryId: number;
}

export interface OrdersRepository {
  /** Load the book + the library, requiring the library to be currently visible (active). */
  findOrderableTargets(bookId: number, libraryId: number, now: Date): Promise<OrderableTargets | null>;
  create(data: CreateOrderData): Promise<OrderDetails>;
  findById(id: number): Promise<OrderDetails | null>;
  list(args: OrderListArgs): Promise<OrderDetails[]>;
  /** Conditional transition: only applies if the order is still in one of `from`. */
  transition(id: number, from: readonly OrderStatus[], to: OrderStatus): Promise<boolean>;
  /** Distinct books the user has at least one RECEIVED order for (id-cursor paginated). */
  listReceivedBooks(args: ReceivedBooksArgs): Promise<ReceivedBookRow[]>;
}

export interface ReceivedBooksArgs {
  readonly userId: number;
  readonly cursor: number | undefined;
  readonly limit: number;
  readonly sortOrder: SortOrder;
}

export interface ReceivedBookRow {
  id: number;
  title: string;
  pages: number;
  thumbnailUrl: string | null;
  avgRating: number;
  ratingCount: number;
}

export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly db: PrismaClient) {}

  async findOrderableTargets(bookId: number, libraryId: number, now: Date): Promise<OrderableTargets | null> {
    const [book, library] = await Promise.all([
      this.db.book.findUnique({ where: { id: bookId }, select: { id: true, pages: true } }),
      this.db.library.findFirst({
        where: { id: libraryId, ...visibleLibraryWhere(now) },
        select: { id: true, pagePrice: true, extraFees: true },
      }),
    ]);
    if (!book || !library) return null;
    return { book, library };
  }

  create(data: CreateOrderData): Promise<OrderDetails> {
    return this.db.bookPrintOrder.create({
      data: {
        senderId: data.senderId,
        bookId: data.bookId,
        libraryId: data.libraryId,
        pageCount: data.pageCount,
        snapshotPagePrice: data.snapshotPagePrice,
        snapshotExtraFees: data.snapshotExtraFees,
        totalPrice: data.totalPrice,
      },
      ...orderDetailArgs,
    });
  }

  findById(id: number): Promise<OrderDetails | null> {
    return this.db.bookPrintOrder.findUnique({ where: { id }, ...orderDetailArgs });
  }

  list(args: OrderListArgs): Promise<OrderDetails[]> {
    return this.db.bookPrintOrder.findMany({
      where: buildWhere(args.filter),
      orderBy: orderByWithTiebreaker(args.sortBy, args.sortOrder),
      ...idCursorArgs(args.cursor, args.limit),
      ...orderDetailArgs,
    });
  }

  async transition(id: number, from: readonly OrderStatus[], to: OrderStatus): Promise<boolean> {
    const { count } = await this.db.bookPrintOrder.updateMany({
      where: { id, status: { in: [...from] as BookPrintOrderStatus[] } },
      data: { status: to },
    });
    return count === 1;
  }

  listReceivedBooks(args: ReceivedBooksArgs): Promise<ReceivedBookRow[]> {
    // Query books (not orders) so each book appears once, with normal id-cursor pagination.
    return this.db.book.findMany({
      where: { requests: { some: { senderId: args.userId, status: 'RECEIVED' } } },
      orderBy: { id: args.sortOrder },
      ...idCursorArgs(args.cursor, args.limit),
      select: { id: true, title: true, pages: true, thumbnailUrl: true, avgRating: true, ratingCount: true },
    });
  }
}

function buildWhere(filter: OrderListFilter): Prisma.BookPrintOrderWhereInput {
  return {
    ...(filter.senderId === undefined ? {} : { senderId: filter.senderId }),
    ...(filter.libraryId === undefined ? {} : { libraryId: filter.libraryId }),
    ...(filter.status === undefined ? {} : { status: filter.status }),
    ...(filter.bookId === undefined ? {} : { bookId: filter.bookId }),
  };
}
