import { ForbiddenError } from '../../shared/errors/index.js';

/**
 * Rating eligibility rule (context-based). The repository provides the fact
 * (does the user have a RECEIVED order for this subject?); the policy enforces it.
 *
 * - A book may be rated only by a user who has a RECEIVED order containing that book.
 * - A library may be rated only by a user who has a RECEIVED order from that library.
 */
export const ratingPolicy = {
  assertEligible(hasReceivedOrder: boolean, subject: 'book' | 'library'): void {
    if (!hasReceivedOrder) {
      throw new ForbiddenError(
        `You can only rate a ${subject} you have received an order for`,
        'RATING_NOT_ALLOWED',
      );
    }
  },
} as const;
