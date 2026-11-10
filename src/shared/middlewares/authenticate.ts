import type { RequestHandler } from 'express';
import { authContextService } from '../auth/index.js';
import { ForbiddenError } from '../errors/index.js';
import { extractBearerToken } from '../security/jwt.js';

export interface AuthenticateOptions {
  /**
   * Libraries without an active subscription are locked out of the platform.
   * Only a few routes (view plans, request a subscription, /auth/me) opt in to
   * let them through so they can actually get activated.
   */
  readonly allowInactiveLibrary?: boolean;
}

export function authenticate(options: AuthenticateOptions = {}): RequestHandler {
  return async (req, _res, next) => {
    const token = extractBearerToken(req.headers.authorization);
    const ctx = await authContextService.resolveFromToken(token);

    if (ctx.role === 'LIBRARY' && !ctx.hasActiveSubscription && !options.allowInactiveLibrary) {
      throw new ForbiddenError(
        'Your library has no active subscription. Please wait for an admin to activate it.',
        'LIBRARY_SUBSCRIPTION_INACTIVE',
      );
    }

    req.auth = ctx;
    next();
  };
}
