import type { AuthContext, LibraryAuthContext, UserAuthContext } from '../../shared/auth/index.js';
import { ForbiddenError } from '../../shared/errors/index.js';
import type { OrderDetails } from './orders.entity.js';

/**
 * Context/ownership rules for orders. The route guard decides who may call an action;
 * this decides which orders they may see or act on. Mismatches surface as 404 at the
 * service layer so order ids cannot be probed (IDOR).
 */
export const orderPolicy = {
  /** Resolve the list scope for the caller. */
  listScope(
    actor: AuthContext,
    requested: { libraryId?: number; senderId?: number },
  ): { senderId?: number; libraryId?: number } {
    switch (actor.role) {
      case 'ADMIN':
        return { senderId: requested.senderId, libraryId: requested.libraryId };
      case 'USER':
        return { senderId: actor.profileId };
      case 'LIBRARY':
        return { libraryId: actor.profileId };
    }
  },

  canView(actor: AuthContext, order: OrderDetails): boolean {
    switch (actor.role) {
      case 'ADMIN':
        return true;
      case 'USER':
        return order.senderId === actor.profileId;
      case 'LIBRARY':
        return order.libraryId === actor.profileId;
    }
  },

  assertOwnedByUser(actor: UserAuthContext, order: OrderDetails): void {
    if (order.senderId !== actor.profileId) {
      throw new ForbiddenError('You can only act on your own orders', 'RESOURCE_FORBIDDEN');
    }
  },

  assertOwnedByLibrary(actor: LibraryAuthContext, order: OrderDetails): void {
    if (order.libraryId !== actor.profileId) {
      throw new ForbiddenError('You can only act on orders sent to your library', 'RESOURCE_FORBIDDEN');
    }
  },
} as const;
