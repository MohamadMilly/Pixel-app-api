import { describe, expect, it } from '@jest/globals';
import { RatingsService } from '../../src/features/ratings/ratings.service.js';

const user = { role: 'USER', profileId: 2, accountId: 2 } as never;

function buildService(overrides: Record<string, unknown> = {}) {
  const repo = {
    bookExists: async () => true,
    libraryExists: async () => true,
    hasReceivedOrderForBook: async () => false,
    hasReceivedOrderFromLibrary: async () => false,
    rateBook: async () => ({ rating: 5, avgRating: 5, ratingCount: 1 }),
    rateLibrary: async () => ({ rating: 4, avgRating: 4, ratingCount: 1 }),
    listBookRatings: async () => [],
    listLibraryRatings: async () => [],
    ...overrides,
  };
  return new RatingsService(repo as never);
}

describe('rating guardrails (RECEIVED required)', () => {
  it('blocks rating a book without a RECEIVED order', async () => {
    const service = buildService({ hasReceivedOrderForBook: async () => false });
    await expect(service.rateBook(user, 1, { rating: 5 })).rejects.toMatchObject({
      statusCode: 403,
      code: 'RATING_NOT_ALLOWED',
    });
  });

  it('blocks rating a library without a RECEIVED order', async () => {
    const service = buildService({ hasReceivedOrderFromLibrary: async () => false });
    await expect(service.rateLibrary(user, 1, { rating: 4 })).rejects.toMatchObject({
      code: 'RATING_NOT_ALLOWED',
    });
  });

  it('allows rating a book once a RECEIVED order exists, returning the recomputed average', async () => {
    const service = buildService({ hasReceivedOrderForBook: async () => true });
    const out = await service.rateBook(user, 1, { rating: 5 });
    expect(out).toEqual({ rating: 5, avgRating: 5, ratingCount: 1 });
  });

  it('404s when rating a non-existent book', async () => {
    const service = buildService({ bookExists: async () => false });
    await expect(service.rateBook(user, 999, { rating: 5 })).rejects.toMatchObject({ statusCode: 404 });
  });
});
