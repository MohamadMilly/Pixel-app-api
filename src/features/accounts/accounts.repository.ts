import type { AccountStatus, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { safeAccountArgs } from '../../shared/auth/index.js';
import { idCursorArgs, orderByWithTiebreaker } from '../../shared/pagination/cursor-pagination.js';
import type { SortOrder } from '../../types/api.types.js';
import type { AccountEntity, AccountListFilter, AccountSortField } from './accounts.entity.js';

export interface AccountListArgs {
  readonly filter: AccountListFilter;
  readonly cursor: number | undefined;
  readonly limit: number;
  readonly sortBy: AccountSortField;
  readonly sortOrder: SortOrder;
}

export interface AccountsRepository {
  list(args: AccountListArgs): Promise<AccountEntity[]>;
  findById(id: number): Promise<AccountEntity | null>;
  /**
   * Conditional status change: only applied if the current status is one of `from`
   * (guards against concurrent admin actions). Returns false if nothing changed.
   */
  transitionStatus(id: number, from: readonly AccountStatus[], to: AccountStatus): Promise<boolean>;
}

export class PrismaAccountsRepository implements AccountsRepository {
  constructor(private readonly db: PrismaClient) {}

  list(args: AccountListArgs): Promise<AccountEntity[]> {
    return this.db.userAccount.findMany({
      where: buildWhere(args.filter),
      orderBy: orderByWithTiebreaker(args.sortBy, args.sortOrder),
      ...idCursorArgs(args.cursor, args.limit),
      ...safeAccountArgs,
    });
  }

  findById(id: number): Promise<AccountEntity | null> {
    return this.db.userAccount.findUnique({ where: { id }, ...safeAccountArgs });
  }

  async transitionStatus(id: number, from: readonly AccountStatus[], to: AccountStatus): Promise<boolean> {
    const { count } = await this.db.userAccount.updateMany({
      where: { id, status: { in: [...from] }, role: { not: 'ADMIN' } },
      data: { status: to },
    });
    return count === 1;
  }
}

function buildWhere(filter: AccountListFilter): Prisma.UserAccountWhereInput {
  return {
    ...(filter.role === undefined ? {} : { role: filter.role }),
    ...(filter.status === undefined ? {} : { status: filter.status }),
    ...(filter.username ? { username: { contains: filter.username, mode: 'insensitive' } } : {}),
  };
}
