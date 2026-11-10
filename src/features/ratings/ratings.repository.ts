import type { PrismaClient } from '../../generated/prisma/client.js';
import type { SortOrder } from '../../types/api.types.js';
import {
  ratingRowArgs,
  type BookRatingRow,
  type LibraryRatingRow,
  type RatingOutcome,
} from './ratings.entity.js';

export interface RatingListArgs {
  readonly subjectId: number;
  readonly cursorUserId: number | undefined;
  readonly limit: number;
  readonly sortOrder: SortOrder;
}

export interface RatingsRepository {
  bookExists(bookId: number): Promise<boolean>;
  libraryExists(libraryId: number): Promise<boolean>;
  hasReceivedOrderForBook(userId: number, bookId: number): Promise<boolean>;
  hasReceivedOrderFromLibrary(userId: number, libraryId: number): Promise<boolean>;

  /** Upsert the rating AND recompute the book's avg/count in ONE transaction (SSOT). */
  rateBook(userId: number, bookId: number, rating: number): Promise<RatingOutcome>;
  rateLibrary(userId: number, libraryId: number, rating: number): Promise<RatingOutcome>;

  listBookRatings(args: RatingListArgs): Promise<BookRatingRow[]>;
  listLibraryRatings(args: RatingListArgs): Promise<LibraryRatingRow[]>;
}

export class PrismaRatingsRepository implements RatingsRepository {
  constructor(private readonly db: PrismaClient) {}

  async bookExists(bookId: number): Promise<boolean> {
    return (await this.db.book.findUnique({ where: { id: bookId }, select: { id: true } })) !== null;
  }

  async libraryExists(libraryId: number): Promise<boolean> {
    return (await this.db.library.findUnique({ where: { id: libraryId }, select: { id: true } })) !== null;
  }

  async hasReceivedOrderForBook(userId: number, bookId: number): Promise<boolean> {
    const order = await this.db.bookPrintOrder.findFirst({
      where: { senderId: userId, bookId, status: 'RECEIVED' },
      select: { id: true },
    });
    return order !== null;
  }

  async hasReceivedOrderFromLibrary(userId: number, libraryId: number): Promise<boolean> {
    const order = await this.db.bookPrintOrder.findFirst({
      where: { senderId: userId, libraryId, status: 'RECEIVED' },
      select: { id: true },
    });
    return order !== null;
  }

  rateBook(userId: number, bookId: number, rating: number): Promise<RatingOutcome> {
    return this.db.$transaction(async (tx) => {
      await tx.userBookRating.upsert({
        where: { userId_bookId: { userId, bookId } },
        create: { userId, bookId, rating },
        update: { rating, ratedAt: new Date() },
      });
      // Recompute the derived cache from the source rows, atomically.
      const agg = await tx.userBookRating.aggregate({ where: { bookId }, _avg: { rating: true }, _count: true });
      const avgRating = agg._avg.rating ?? 0;
      const ratingCount = agg._count;
      await tx.book.update({ where: { id: bookId }, data: { avgRating, ratingCount } });
      return { rating, avgRating, ratingCount };
    });
  }

  rateLibrary(userId: number, libraryId: number, rating: number): Promise<RatingOutcome> {
    return this.db.$transaction(async (tx) => {
      await tx.userLibraryRating.upsert({
        where: { userId_libraryId: { userId, libraryId } },
        create: { userId, libraryId, rating },
        update: { rating, ratedAt: new Date() },
      });
      const agg = await tx.userLibraryRating.aggregate({ where: { libraryId }, _avg: { rating: true }, _count: true });
      const avgRating = agg._avg.rating ?? 0;
      const ratingCount = agg._count;
      await tx.library.update({ where: { id: libraryId }, data: { avgRating, ratingCount } });
      return { rating, avgRating, ratingCount };
    });
  }

  listBookRatings(args: RatingListArgs): Promise<BookRatingRow[]> {
    return this.db.userBookRating.findMany({
      where: { bookId: args.subjectId },
      orderBy: [{ ratedAt: args.sortOrder }, { userId: args.sortOrder }],
      take: args.limit + 1,
      ...(args.cursorUserId === undefined
        ? {}
        : { skip: 1, cursor: { userId_bookId: { userId: args.cursorUserId, bookId: args.subjectId } } }),
      ...ratingRowArgs,
    });
  }

  listLibraryRatings(args: RatingListArgs): Promise<LibraryRatingRow[]> {
    return this.db.userLibraryRating.findMany({
      where: { libraryId: args.subjectId },
      orderBy: [{ ratedAt: args.sortOrder }, { userId: args.sortOrder }],
      take: args.limit + 1,
      ...(args.cursorUserId === undefined
        ? {}
        : { skip: 1, cursor: { userId_libraryId: { userId: args.cursorUserId, libraryId: args.subjectId } } }),
      ...ratingRowArgs,
    });
  }
}
