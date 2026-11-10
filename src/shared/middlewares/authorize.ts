import type { RequestHandler } from 'express';
import type { UserRole } from '../../generated/prisma/client.js';
import { getAuth } from '../auth/request-auth.js';
import { ForbiddenError } from '../errors/index.js';
import { hasPermission, type Permission } from '../rbac/permissions.js';

/** Require ALL listed permissions. Must run after `authenticate`. */
export function authorize(...permissions: readonly Permission[]): RequestHandler {
  return (req, _res, next) => {
    const { role } = getAuth(req);
    const missing = permissions.filter((permission) => !hasPermission(role, permission));
    if (missing.length > 0) {
      throw new ForbiddenError(`Missing permission: ${missing.join(', ')}`);
    }
    next();
  };
}

/** Require ANY of the listed permissions (useful for endpoints shared by several roles). */
export function authorizeAny(...permissions: readonly Permission[]): RequestHandler {
  return (req, _res, next) => {
    const { role } = getAuth(req);
    if (!permissions.some((permission) => hasPermission(role, permission))) {
      throw new ForbiddenError();
    }
    next();
  };
}

/** Restrict a route to specific roles (for routes "marked for libraries" etc.). */
export function requireRoles(...roles: readonly UserRole[]): RequestHandler {
  return (req, _res, next) => {
    const { role } = getAuth(req);
    if (!roles.includes(role)) {
      throw new ForbiddenError(`This route is only available to: ${roles.join(', ')}`);
    }
    next();
  };
}
