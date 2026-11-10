import { ForbiddenError, UnauthorizedError } from '../errors/index.js';
import { verifyAccessToken } from '../security/jwt.js';
import type { AuthContextRepository } from './auth-context.repository.js';
import type { AuthContext, SafeAccount } from './auth-context.types.js';

/**
 * Turns a raw JWT into a DB-verified AuthContext.
 * Shared by the HTTP `authenticate` middleware and the Socket.io handshake.
 */
export class AuthContextService {
  constructor(private readonly repository: AuthContextRepository) {}

  async resolveFromToken(token: string): Promise<AuthContext> {
    const payload = verifyAccessToken(token);
    const account = await this.repository.findAccountById(payload.accountId);

    if (!account || account.role !== payload.role) {
      throw new UnauthorizedError('Account no longer matches this token', 'TOKEN_INVALID');
    }
    assertAccountIsActive(account);

    switch (account.role) {
      case 'USER': {
        if (!account.user || account.user.id !== payload.id) throw invalidProfile();
        return { role: 'USER', account, accountId: account.id, profileId: account.user.id, user: account.user };
      }
      case 'ADMIN': {
        if (!account.admin || account.admin.id !== payload.id) throw invalidProfile();
        return { role: 'ADMIN', account, accountId: account.id, profileId: account.admin.id, admin: account.admin };
      }
      case 'LIBRARY': {
        if (!account.library || account.library.id !== payload.id) throw invalidProfile();
        const hasActiveSubscription = await this.repository.libraryHasActiveSubscription(
          account.library.id,
          new Date(),
        );
        return {
          role: 'LIBRARY',
          account,
          accountId: account.id,
          profileId: account.library.id,
          library: account.library,
          hasActiveSubscription,
        };
      }
      default:
        return assertNever(account.role);
    }
  }
}

function assertNever(value: never): never {
  throw new UnauthorizedError(`Unsupported account role: ${String(value)}`, 'TOKEN_INVALID');
}

export function assertAccountIsActive(account: Pick<SafeAccount, 'status'>): void {
  if (account.status !== 'ACTIVE') {
    throw new ForbiddenError(`Account is ${account.status.toLowerCase()}`, `ACCOUNT_${account.status}`);
  }
}

function invalidProfile(): UnauthorizedError {
  return new UnauthorizedError('Account profile does not match this token', 'TOKEN_INVALID');
}
