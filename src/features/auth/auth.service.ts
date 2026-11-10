import { env } from '../../config/env.js';
import { assertAccountIsActive, type AuthContext, type SafeAccount } from '../../shared/auth/index.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/index.js';
import type { DomainEventBus } from '../../shared/events/domain-events.js';
import type { RequestContext } from '../../shared/http/request-context.js';
import { signAccessToken, type AccessTokenPayload } from '../../shared/security/jwt.js';
import { getDummyPasswordHash, hashPassword, verifyPassword } from '../../shared/security/password.js';
import { generateOpaqueToken, hashToken } from '../../shared/security/tokens.js';
import { addSeconds } from '../../shared/utils/date.js';
import {
  presentAccount,
  presentAuthToken,
  presentRefreshedToken,
  type AccountView,
  type AuthTokenView,
  type IssuedTokens,
  type LoginDto,
  type LogoutDto,
  type RefreshedTokenView,
  type RefreshTokenDto,
  type SignupLibraryDto,
  type SignupUserDto,
} from './auth.dto.js';
import type { LoginRole } from './auth.entity.js';
import type { AuthRepository } from './auth.repository.js';
import type { CreateRefreshTokenData, RefreshTokenRepository } from './refresh-token.repository.js';

type AccountProfiles = Pick<SafeAccount, 'id' | 'role' | 'user' | 'admin' | 'library'>;
type SafeAccountCore = Omit<SafeAccount, 'user' | 'admin' | 'library'>;

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly events: DomainEventBus,
  ) {}

  async login(role: LoginRole, dto: LoginDto, ctx: RequestContext): Promise<AuthTokenView> {
    const account = await this.repository.findByUsernameWithCredentials(dto.username);

    // Always run bcrypt, even for unknown usernames, to keep response time constant.
    const passwordHash = account?.password ?? (await getDummyPasswordHash());
    const passwordMatches = await verifyPassword(dto.password, passwordHash);

    // Wrong role is reported exactly like a wrong password (no account-type enumeration).
    if (!account || !passwordMatches || account.role !== role) {
      this.events.emit('auth.login_failed', { username: dto.username, ip: ctx.ip });
      throw new UnauthorizedError('Invalid username or password', 'INVALID_CREDENTIALS');
    }
    assertAccountIsActive(account);

    const profileId = resolveProfileId(account);
    const subscriptionActive =
      account.role === 'LIBRARY'
        ? await this.repository.libraryHasActiveSubscription(profileId, new Date())
        : undefined;

    const { password: _password, ...safeAccount } = account;
    const tokens = await this.issueTokens(safeAccount, profileId, ctx);
    this.events.emit('auth.login', { accountId: safeAccount.id, role: safeAccount.role, ip: ctx.ip });
    return presentAuthToken(tokens, presentAccount(safeAccount, profileId, subscriptionActive));
  }

  async signupUser(dto: SignupUserDto, ctx: RequestContext): Promise<AuthTokenView> {
    await this.assertUsernameAvailable(dto.username);

    const account = await this.repository.createUserAccount({
      username: dto.username,
      passwordHash: await hashPassword(dto.password),
      firstname: dto.firstname,
      lastname: dto.lastname,
    });

    const profileId = resolveProfileId(account);
    const tokens = await this.issueTokens(account, profileId, ctx);
    this.events.emit('auth.signup', { accountId: account.id, role: account.role, ip: ctx.ip });
    return presentAuthToken(tokens, presentAccount(account, profileId));
  }

  /**
   * Libraries register together with the plan they want. They receive tokens but
   * stay hidden and locked out of every route until an admin activates the subscription.
   */
  async signupLibrary(dto: SignupLibraryDto, ctx: RequestContext): Promise<AuthTokenView> {
    await this.assertUsernameAvailable(dto.username);

    const plan = await this.repository.findActivePlan(dto.planId);
    if (!plan) {
      throw new NotFoundError('Plan', 'PLAN_NOT_FOUND');
    }

    const account = await this.repository.createLibraryAccount({
      username: dto.username,
      passwordHash: await hashPassword(dto.password),
      firstname: dto.firstname,
      lastname: dto.lastname,
      title: dto.title,
      location: dto.location,
      latitude: dto.latitude,
      longitude: dto.longitude,
      pagePrice: dto.pagePrice,
      extraFees: dto.extraFees,
      plan: { id: plan.id, durationDays: plan.durationDays },
    });

    const profileId = resolveProfileId(account);
    const tokens = await this.issueTokens(account, profileId, ctx);
    this.events.emit('auth.signup', { accountId: account.id, role: account.role, ip: ctx.ip });
    return presentAuthToken(tokens, presentAccount(account, profileId, false));
  }

  /**
   * Exchange a valid refresh token for a new access + refresh pair (rotation).
   * Presenting an already-rotated/revoked token is treated as theft: every session
   * of that account is revoked.
   */
  async refresh(dto: RefreshTokenDto, ctx: RequestContext): Promise<RefreshedTokenView> {
    const presentedHash = hashToken(dto.refreshToken);
    const stored = await this.refreshTokens.findByHash(presentedHash);
    if (!stored) {
      throw new UnauthorizedError('Invalid refresh token', 'REFRESH_TOKEN_INVALID');
    }

    if (stored.revokedAt !== null) {
      // Reuse of a rotated/revoked token → revoke the whole account's sessions.
      await this.refreshTokens.revokeAllForAccount(stored.accountId);
      this.events.emit('auth.refresh_reuse_detected', { accountId: stored.accountId, ip: ctx.ip });
      throw new UnauthorizedError('Refresh token has been revoked', 'REFRESH_TOKEN_REUSED');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }

    const account = await this.refreshTokens.findAccount(stored.accountId);
    if (!account) {
      throw new UnauthorizedError('Account no longer exists', 'ACCOUNT_NOT_FOUND');
    }
    assertAccountIsActive(account);
    const profileId = resolveProfileId(account);

    const rawRefresh = generateOpaqueToken();
    const replacement = this.buildRefreshRow(account.id, rawRefresh, ctx);
    const rotated = await this.refreshTokens.rotate(presentedHash, replacement);
    if (!rotated) {
      // Lost the race with a concurrent refresh → treat as reuse.
      await this.refreshTokens.revokeAllForAccount(account.id);
      this.events.emit('auth.refresh_reuse_detected', { accountId: account.id, ip: ctx.ip });
      throw new UnauthorizedError('Refresh token has been revoked', 'REFRESH_TOKEN_REUSED');
    }

    this.events.emit('auth.refresh', { accountId: account.id, ip: ctx.ip });
    return presentRefreshedToken(
      this.buildIssuedTokens(
        { id: profileId, accountId: account.id, role: account.role, status: account.status },
        rawRefresh,
      ),
    );
  }

  async logout(dto: LogoutDto, ctx: RequestContext): Promise<void> {
    const tokenHash = hashToken(dto.refreshToken);
    const stored = await this.refreshTokens.findByHash(tokenHash);
    if (!stored) {
      return; // idempotent: unknown/already-gone token is a no-op
    }
    if (dto.allSessions) {
      await this.refreshTokens.revokeAllForAccount(stored.accountId);
    } else {
      await this.refreshTokens.revoke(tokenHash);
    }
    this.events.emit('auth.logout', { accountId: stored.accountId, allSessions: dto.allSessions, ip: ctx.ip });
  }

  me(ctx: AuthContext): AccountView {
    return presentAccount(
      ctx.account,
      ctx.profileId,
      ctx.role === 'LIBRARY' ? ctx.hasActiveSubscription : undefined,
    );
  }

  /* ───────────────────────────── token helpers ───────────────────────────── */

  private async issueTokens(account: SafeAccountCore, profileId: number, ctx: RequestContext): Promise<IssuedTokens> {
    const rawRefresh = generateOpaqueToken();
    await this.refreshTokens.create(this.buildRefreshRow(account.id, rawRefresh, ctx));
    return this.buildIssuedTokens(
      { id: profileId, accountId: account.id, role: account.role, status: account.status },
      rawRefresh,
    );
  }

  private buildIssuedTokens(payload: AccessTokenPayload, rawRefresh: string): IssuedTokens {
    return {
      accessToken: signAccessToken(payload),
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: rawRefresh,
      refreshExpiresIn: env.REFRESH_TOKEN_TTL_SECONDS,
    };
  }

  private buildRefreshRow(accountId: number, rawRefresh: string, ctx: RequestContext): CreateRefreshTokenData {
    return {
      accountId,
      tokenHash: hashToken(rawRefresh),
      expiresAt: addSeconds(new Date(), env.REFRESH_TOKEN_TTL_SECONDS),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    };
  }

  private async assertUsernameAvailable(username: string): Promise<void> {
    if (await this.repository.usernameExists(username)) {
      throw new ConflictError('Username is already taken', 'USERNAME_TAKEN');
    }
  }
}

function resolveProfileId(account: AccountProfiles): number {
  const profile =
    account.role === 'USER' ? account.user : account.role === 'ADMIN' ? account.admin : account.library;
  if (!profile) {
    // Data-integrity problem: an account exists without its role profile.
    throw new UnauthorizedError('Account profile is missing', 'ACCOUNT_PROFILE_MISSING');
  }
  return profile.id;
}
