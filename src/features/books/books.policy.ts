import type { AuthContext } from '../../shared/auth/index.js';

/**
 * Context rule for book file exposure.
 *
 * CRITICAL SECURITY: a normal user (or anonymous caller) must NEVER receive the file
 * path, file id, or signed URL. Only ADMIN and LIBRARY callers get the privileged view
 * with a temporary signed URL. `actor` is undefined for anonymous (public) requests.
 */
export const bookPolicy = {
  canSeeFile(actor: AuthContext | undefined): boolean {
    return actor?.role === 'ADMIN' || actor?.role === 'LIBRARY';
  },
} as const;
