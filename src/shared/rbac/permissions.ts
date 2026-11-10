import type { UserRole } from '../../generated/prisma/client.js';

export const Permission = {
  // Books & categories
  BOOK_READ: 'book:read',
  BOOK_CREATE: 'book:create',
  BOOK_UPDATE: 'book:update',
  BOOK_DELETE: 'book:delete',
  CATEGORY_MANAGE: 'category:manage',

  // Files (uploads)
  FILE_WRITE: 'file:write',

  // Accounts
  ACCOUNT_READ: 'account:read',
  ACCOUNT_BAN: 'account:ban',

  // Plans & subscriptions
  PLAN_READ: 'plan:read',
  PLAN_MANAGE: 'plan:manage',
  SUBSCRIPTION_REQUEST: 'subscription:request',
  SUBSCRIPTION_READ_OWN: 'subscription:read:own',
  SUBSCRIPTION_READ_ANY: 'subscription:read:any',
  SUBSCRIPTION_CANCEL_OWN: 'subscription:cancel:own',
  SUBSCRIPTION_ACTIVATE: 'subscription:activate',
  SUBSCRIPTION_REJECT: 'subscription:reject',

  // Libraries
  LIBRARY_READ: 'library:read',
  LIBRARY_UPDATE_OWN: 'library:update:own',

  // Orders
  ORDER_CREATE: 'order:create',
  ORDER_READ_OWN: 'order:read:own',
  ORDER_READ_LIBRARY: 'order:read:library',
  ORDER_READ_ANY: 'order:read:any',
  ORDER_CANCEL: 'order:cancel',
  ORDER_RECEIVE: 'order:receive',
  ORDER_ACCEPT: 'order:accept',
  ORDER_REJECT: 'order:reject',
  ORDER_FULFILL: 'order:fulfill',

  // Ratings
  RATING_READ: 'rating:read',
  RATING_BOOK_WRITE: 'rating:book:write',
  RATING_LIBRARY_WRITE: 'rating:library:write',

  // Notifications
  NOTIFICATION_READ: 'notification:read',

  // Audit
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const P = Permission;

const ROLE_PERMISSIONS: Readonly<Record<UserRole, ReadonlySet<Permission>>> = {
  ADMIN: new Set<Permission>([
    P.BOOK_READ,
    P.BOOK_CREATE,
    P.BOOK_UPDATE,
    P.BOOK_DELETE,
    P.CATEGORY_MANAGE,
    P.FILE_WRITE,
    P.ACCOUNT_READ,
    P.ACCOUNT_BAN,
    P.PLAN_READ,
    P.PLAN_MANAGE,
    P.SUBSCRIPTION_READ_ANY,
    P.SUBSCRIPTION_ACTIVATE,
    P.SUBSCRIPTION_REJECT,
    P.LIBRARY_READ,
    P.ORDER_READ_ANY,
    P.RATING_READ,
    P.AUDIT_READ,
    P.NOTIFICATION_READ,
  ]),
  LIBRARY: new Set<Permission>([
    P.BOOK_READ,
    P.PLAN_READ,
    P.SUBSCRIPTION_REQUEST,
    P.SUBSCRIPTION_READ_OWN,
    P.SUBSCRIPTION_CANCEL_OWN,
    P.LIBRARY_UPDATE_OWN,
    P.ORDER_READ_LIBRARY,
    P.ORDER_ACCEPT,
    P.ORDER_REJECT,
    P.ORDER_FULFILL,
    P.RATING_READ,
    P.NOTIFICATION_READ,
  ]),
  USER: new Set<Permission>([
    P.BOOK_READ,
    P.LIBRARY_READ,
    P.ORDER_CREATE,
    P.ORDER_READ_OWN,
    P.ORDER_CANCEL,
    P.ORDER_RECEIVE,
    P.RATING_READ,
    P.RATING_BOOK_WRITE,
    P.RATING_LIBRARY_WRITE,
    P.NOTIFICATION_READ,
  ]),
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function hasAnyPermission(role: UserRole, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}
