import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination/cursor-pagination.js';
import { idParamsSchema } from '../../shared/validation/parse-input.js';
import { RATING_MAX, RATING_MIN, type BookRatingRow, type LibraryRatingRow, type RatingOutcome } from './ratings.entity.js';

export const bookIdParams = idParamsSchema('bookId');
export const libraryIdParams = idParamsSchema('libraryId');

export const rateDto = z.strictObject({
  rating: z.number().int().min(RATING_MIN).max(RATING_MAX),
});
export type RateDto = z.infer<typeof rateDto>;

/** Ratings paginate by userId (unique within a subject); cursor = last userId seen. */
export const listRatingsQuery = paginationQuerySchema;
export type ListRatingsQuery = z.infer<typeof listRatingsQuery>;

export interface RatingOutcomeView {
  readonly rating: number;
  readonly avgRating: number;
  readonly ratingCount: number;
}

export function presentRatingOutcome(outcome: RatingOutcome): RatingOutcomeView {
  return { rating: outcome.rating, avgRating: outcome.avgRating, ratingCount: outcome.ratingCount };
}

export interface RatingItemView {
  readonly userId: number;
  readonly username: string | null;
  readonly rating: number;
  readonly ratedAt: Date;
}

export function presentBookRating(row: BookRatingRow): RatingItemView {
  return { userId: row.userId, username: row.user.account.username, rating: row.rating, ratedAt: row.ratedAt };
}

export function presentLibraryRating(row: LibraryRatingRow): RatingItemView {
  return { userId: row.userId, username: row.user.account.username, rating: row.rating, ratedAt: row.ratedAt };
}
