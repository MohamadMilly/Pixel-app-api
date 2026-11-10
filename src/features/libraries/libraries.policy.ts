import type { AuthContext, LibraryAuthContext } from '../../shared/auth/index.js';
import { ForbiddenError } from '../../shared/errors/index.js';
import type { LibraryDetails } from './libraries.entity.js';

/**
 * Context-based rules for libraries.
 *  - USER  : sees only currently-visible libraries (active subscription + ACTIVE account).
 *  - LIBRARY: sees/edits only its OWN record, even while inactive.
 *  - ADMIN : sees everything; may opt into hidden libraries on lists.
 */
export const libraryPolicy = {
  /** Can this actor request hidden (inactive) libraries in a list? Admins only. */
  mayIncludeHidden(actor: AuthContext, requested: boolean | undefined): boolean {
    return actor.role === 'ADMIN' ? (requested ?? false) : false;
  },

  /** Ownership check for mutations — a library may only touch its own profile. */
  assertCanUpdate(actor: LibraryAuthContext, library: LibraryDetails): void {
    if (library.id !== actor.profileId) {
      // 404-style message is used at the service layer; here we guard explicit mutation attempts.
      throw new ForbiddenError('Libraries can only modify their own profile', 'RESOURCE_FORBIDDEN');
    }
  },

  isOwner(actor: LibraryAuthContext, library: LibraryDetails): boolean {
    return library.id === actor.profileId;
  },
} as const;
