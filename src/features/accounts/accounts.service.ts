import type { AdminAuthContext } from '../../shared/auth/index.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
import type { DomainEventBus } from '../../shared/events/domain-events.js';
import { buildPage, mapPage } from '../../shared/pagination/cursor-pagination.js';
import type { Paginated } from '../../types/api.types.js';
import { presentAccountForAdmin, type AccountAdminView, type ListAccountsQuery } from './accounts.dto.js';
import { BANNABLE_ROLES, BANNABLE_STATUSES, type AccountEntity } from './accounts.entity.js';
import type { AccountsRepository } from './accounts.repository.js';

/**
 * Every method requires an AdminAuthContext at the type level — the compiler
 * itself prevents a non-admin context from reaching this service.
 */
export class AccountsService {
  constructor(
    private readonly repository: AccountsRepository,
    private readonly events: DomainEventBus,
  ) {}

  async list(_admin: AdminAuthContext, query: ListAccountsQuery): Promise<Paginated<AccountAdminView>> {
    const rows = await this.repository.list({
      filter: { role: query.role, status: query.status, username: query.username },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return mapPage(buildPage(rows, query.limit, (account) => account.id), presentAccountForAdmin);
  }

  async getById(_admin: AdminAuthContext, accountId: number): Promise<AccountAdminView> {
    return presentAccountForAdmin(await this.getExistingOrThrow(accountId));
  }

  /**
   * Ban takes effect immediately: `authenticate` reloads the account on every request,
   * so existing tokens of a banned account stop working on their next call.
   */
  async ban(admin: AdminAuthContext, accountId: number): Promise<AccountAdminView> {
    const target = await this.getExistingOrThrow(accountId);

    if (target.id === admin.accountId) {
      throw new ForbiddenError('You cannot ban your own account', 'CANNOT_BAN_SELF');
    }
    if (!BANNABLE_ROLES.includes(target.role)) {
      throw new ForbiddenError('Admin accounts cannot be banned', 'CANNOT_BAN_ADMIN');
    }
    if (target.status === 'BANNED') {
      throw new ConflictError('Account is already banned', 'ALREADY_BANNED');
    }
    if (!BANNABLE_STATUSES.includes(target.status)) {
      throw new ConflictError(`Cannot ban an account with status ${target.status}`, 'INVALID_ACCOUNT_STATUS');
    }

    if (!(await this.repository.transitionStatus(target.id, BANNABLE_STATUSES, 'BANNED'))) {
      throw new ConflictError('Account status changed concurrently, please retry', 'TRANSACTION_CONFLICT');
    }

    this.events.emit('account.banned', { accountId: target.id, role: target.role, byAdminId: admin.profileId });
    return presentAccountForAdmin(await this.getExistingOrThrow(target.id));
  }

  async unban(admin: AdminAuthContext, accountId: number): Promise<AccountAdminView> {
    const target = await this.getExistingOrThrow(accountId);

    if (target.status !== 'BANNED') {
      throw new ConflictError('Account is not banned', 'NOT_BANNED');
    }
    if (!(await this.repository.transitionStatus(target.id, ['BANNED'], 'ACTIVE'))) {
      throw new ConflictError('Account status changed concurrently, please retry', 'TRANSACTION_CONFLICT');
    }

    this.events.emit('account.unbanned', { accountId: target.id, role: target.role, byAdminId: admin.profileId });
    return presentAccountForAdmin(await this.getExistingOrThrow(target.id));
  }

  private async getExistingOrThrow(accountId: number): Promise<AccountEntity> {
    const account = await this.repository.findById(accountId);
    if (!account) throw new NotFoundError('Account');
    return account;
  }
}
