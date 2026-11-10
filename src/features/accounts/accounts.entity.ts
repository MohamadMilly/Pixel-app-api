import type { AccountStatus, UserRole } from '../../generated/prisma/client.js';
import type { SafeAccount } from '../../shared/auth/index.js';

export type AccountEntity = SafeAccount;

export const ACCOUNT_SORT_FIELDS = ['id', 'createdAt', 'username'] as const;
export type AccountSortField = (typeof ACCOUNT_SORT_FIELDS)[number];

export interface AccountListFilter {
  readonly role: UserRole | undefined;
  readonly status: AccountStatus | undefined;
  readonly username: string | undefined;
}

/** Roles an admin is allowed to ban. Admin accounts can never be banned through the API. */
export const BANNABLE_ROLES: readonly UserRole[] = ['USER', 'LIBRARY'];
/** Statuses from which a ban is a valid transition. */
export const BANNABLE_STATUSES: readonly AccountStatus[] = ['ACTIVE', 'SUSPENDED'];
