import type { RequestHandler } from 'express';
import type { UserRole } from '../../generated/prisma/client.js';
import type { Permission } from '../rbac/permissions.js';
import { authenticate } from './authenticate.js';
import { authorize, authorizeAny, requireRoles } from './authorize.js';

export interface GuardOptions {
  /**
   * Roles allowed on this route. REQUIRED and non-empty, so a route cannot be
   * declared without stating explicitly who may call it.
   */
  readonly roles: readonly [UserRole, ...UserRole[]];
  /** The caller must hold ALL of these permissions. */
  readonly permissions?: readonly Permission[];
  /** The caller must hold AT LEAST ONE of these permissions. */
  readonly anyOf?: readonly Permission[];
  /** Let libraries without an active subscription through (plans, subscription requests, /auth/me). */
  readonly allowInactiveLibrary?: boolean;
}

/**
 * The single entry point for protecting a route:
 *   authenticate (JWT + DB check) → role gate → permission gate.
 *
 * Ownership / context checks are NOT done here: they belong to the service layer,
 * which receives the full AuthContext and the actual resource.
 */
export function guard(options: GuardOptions): RequestHandler[] {
  const chain: RequestHandler[] = [
    authenticate({ allowInactiveLibrary: options.allowInactiveLibrary ?? false }),
    requireRoles(...options.roles),
  ];
  if (options.permissions && options.permissions.length > 0) {
    chain.push(authorize(...options.permissions));
  }
  if (options.anyOf && options.anyOf.length > 0) {
    chain.push(authorizeAny(...options.anyOf));
  }
  return chain;
}
