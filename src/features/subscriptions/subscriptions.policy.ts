import type { AuthContext, LibraryAuthContext } from '../../shared/auth/index.js';
import { ForbiddenError } from '../../shared/errors/index.js';
import type { SubscriptionDetails } from './subscriptions.entity.js';

/**
 * Context-based (ownership) rules for subscriptions.
 * Route guards decide WHO may call an endpoint; this decides WHICH records they may touch.
 */
export const subscriptionPolicy = {
  /**
   * Resolve the `libraryId` a list query is scoped to.
   *  - ADMIN   → whatever they asked for (or all)
   *  - LIBRARY → always their own id; asking for another library is rejected
   *  - USER    → never
   */
  listScope(actor: AuthContext, requestedLibraryId: number | undefined): number | undefined {
    switch (actor.role) {
      case 'ADMIN':
        return requestedLibraryId;
      case 'LIBRARY':
        if (requestedLibraryId !== undefined && requestedLibraryId !== actor.profileId) {
          throw new ForbiddenError('Libraries can only access their own subscriptions', 'RESOURCE_FORBIDDEN');
        }
        return actor.profileId;
      case 'USER':
        throw new ForbiddenError('Subscriptions are not available to user accounts');
    }
  },

  canView(actor: AuthContext, subscription: SubscriptionDetails): boolean {
    return actor.role === 'ADMIN' || (actor.role === 'LIBRARY' && isOwner(actor, subscription));
  },

  canCancel(actor: LibraryAuthContext, subscription: SubscriptionDetails): boolean {
    return isOwner(actor, subscription);
  },
} as const;

function isOwner(actor: LibraryAuthContext, subscription: SubscriptionDetails): boolean {
  return subscription.libraryId === actor.profileId;
}
