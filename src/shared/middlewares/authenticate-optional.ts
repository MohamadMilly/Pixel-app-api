import type { RequestHandler } from 'express';
import { authContextService } from '../auth/index.js';
import { AppError } from '../errors/index.js';

/**
 * Attaches `req.auth` when a valid Bearer token is present, but does NOT reject when
 * the header is missing — the route stays public. Used by endpoints whose *output*
 * depends on the caller's role (e.g. books expose a signed file URL only to ADMIN/LIBRARY).
 *
 * A present-but-invalid/expired token is ignored (treated as anonymous) rather than
 * 401, so a stale token never blocks public access. Unexpected (5xx) errors propagate.
 */
export function authenticateOptional(): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header) {
      next();
      return;
    }
    try {
      const token = header.replace(/^Bearer\s+/i, '').trim();
      if (token.length > 0) {
        req.auth = await authContextService.resolveFromToken(token);
      }
    } catch (error: unknown) {
      // Auth/credential problems → stay anonymous. Only surface real server errors.
      if (error instanceof AppError && error.statusCode < 500) {
        next();
        return;
      }
      next(error);
      return;
    }
    next();
  };
}
