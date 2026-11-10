import type { Prisma } from '../../generated/prisma/client.js';

export const ratingRowArgs = {
  include: { user: { select: { id: true, account: { select: { username: true } } } } },
} satisfies Prisma.UserBookRatingDefaultArgs;

export type BookRatingRow = Prisma.UserBookRatingGetPayload<typeof ratingRowArgs>;
export type LibraryRatingRow = Prisma.UserLibraryRatingGetPayload<typeof ratingRowArgs>;

export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Result of an upsert: the caller's rating plus the recomputed aggregate cache. */
export interface RatingOutcome {
  readonly rating: number;
  readonly avgRating: number;
  readonly ratingCount: number;
}
