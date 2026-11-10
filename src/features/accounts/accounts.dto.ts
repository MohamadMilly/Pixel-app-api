import { z } from 'zod';
import { AccountStatus, UserRole } from '../../generated/prisma/client.js';
import { paginationQuerySchema, sortBySchema } from '../../shared/pagination/cursor-pagination.js';
import { idParamsSchema } from '../../shared/validation/parse-input.js';
import { ACCOUNT_SORT_FIELDS, type AccountEntity } from './accounts.entity.js';

/* ───────────────────────────── Input DTOs ───────────────────────────── */

export const accountIdParams = idParamsSchema('accountId');

export const listAccountsQuery = paginationQuerySchema.extend({
  sortBy: sortBySchema(ACCOUNT_SORT_FIELDS, 'createdAt'),
  role: z.enum(UserRole).optional(),
  status: z.enum(AccountStatus).optional(),
  username: z.string().trim().min(1).max(32).optional(),
});
export type ListAccountsQuery = z.infer<typeof listAccountsQuery>;

/* ──────────────────────────── Output presenters ──────────────────────────── */

export interface AccountAdminView {
  readonly id: number;
  readonly username: string | null;
  readonly firstname: string | null;
  readonly lastname: string | null;
  readonly role: UserRole;
  readonly status: AccountStatus;
  readonly createdAt: Date;
  readonly profileId: number | null;
  readonly library: { readonly id: number; readonly title: string } | null;
}

export function presentAccountForAdmin(account: AccountEntity): AccountAdminView {
  const profile = account.user ?? account.library ?? account.admin;
  return {
    id: account.id,
    username: account.username,
    firstname: account.firstname,
    lastname: account.lastname,
    role: account.role,
    status: account.status,
    createdAt: account.createdAt,
    profileId: profile?.id ?? null,
    library: account.library ? { id: account.library.id, title: account.library.title } : null,
  };
}
