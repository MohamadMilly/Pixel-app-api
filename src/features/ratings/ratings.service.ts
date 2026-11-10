import type { AuthContext, UserAuthContext } from '../../shared/auth/index.js';
import { NotFoundError } from '../../shared/errors/index.js';
import { buildPage, mapPage } from '../../shared/pagination/cursor-pagination.js';
import type { Paginated } from '../../types/api.types.js';
import {
  presentBookRating,
  presentLibraryRating,
  presentRatingOutcome,
  type ListRatingsQuery,
  type RateDto,
  type RatingItemView,
  type RatingOutcomeView,
} from './ratings.dto.js';
import { ratingPolicy } from './ratings.policy.js';
import type { RatingsRepository } from './ratings.repository.js';

export class RatingsService {
  constructor(private readonly repository: RatingsRepository) {}

  async rateBook(actor: UserAuthContext, bookId: number, dto: RateDto): Promise<RatingOutcomeView> {
    if (!(await this.repository.bookExists(bookId))) {
      throw new NotFoundError('Book');
    }
    const eligible = await this.repository.hasReceivedOrderForBook(actor.profileId, bookId);
    ratingPolicy.assertEligible(eligible, 'book');
    return presentRatingOutcome(await this.repository.rateBook(actor.profileId, bookId, dto.rating));
  }

  async rateLibrary(actor: UserAuthContext, libraryId: number, dto: RateDto): Promise<RatingOutcomeView> {
    if (!(await this.repository.libraryExists(libraryId))) {
      throw new NotFoundError('Library');
    }
    const eligible = await this.repository.hasReceivedOrderFromLibrary(actor.profileId, libraryId);
    ratingPolicy.assertEligible(eligible, 'library');
    return presentRatingOutcome(await this.repository.rateLibrary(actor.profileId, libraryId, dto.rating));
  }

  async listBookRatings(_actor: AuthContext, bookId: number, query: ListRatingsQuery): Promise<Paginated<RatingItemView>> {
    if (!(await this.repository.bookExists(bookId))) {
      throw new NotFoundError('Book');
    }
    const rows = await this.repository.listBookRatings({
      subjectId: bookId,
      cursorUserId: query.cursor,
      limit: query.limit,
      sortOrder: query.sortOrder,
    });
    return mapPage(buildPage(rows, query.limit, (r) => r.userId), presentBookRating);
  }

  async listLibraryRatings(_actor: AuthContext, libraryId: number, query: ListRatingsQuery): Promise<Paginated<RatingItemView>> {
    if (!(await this.repository.libraryExists(libraryId))) {
      throw new NotFoundError('Library');
    }
    const rows = await this.repository.listLibraryRatings({
      subjectId: libraryId,
      cursorUserId: query.cursor,
      limit: query.limit,
      sortOrder: query.sortOrder,
    });
    return mapPage(buildPage(rows, query.limit, (r) => r.userId), presentLibraryRating);
  }
}
