import type { Request } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/index.js';
import type { AuthContext, AuthContextOf, AuthRole } from './auth-context.types.js';

/** Read the auth context set by `authenticate`. Throws 401 when absent. */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return req.auth;
}

export function isRole<R extends AuthRole>(ctx: AuthContext, role: R): ctx is AuthContextOf<R> {
  return ctx.role === role;
}

/** Read the auth context and narrow it to one role. Throws 403 for any other role. */
export function getAuthAs<R extends AuthRole>(req: Request, role: R): AuthContextOf<R> {
  const ctx = getAuth(req);
  if (!isRole(ctx, role)) {
    throw new ForbiddenError(`This action is only available to ${role.toLowerCase()} accounts`);
  }
  return ctx;
}
