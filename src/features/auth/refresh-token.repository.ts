import type { PrismaClient } from '../../generated/prisma/client.js';
import { safeAccountArgs, type SafeAccount } from '../../shared/auth/index.js';

export interface StoredRefreshToken {
  readonly id: number;
  readonly accountId: number;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly replacedByTokenHash: string | null;
}

export interface CreateRefreshTokenData {
  readonly accountId: number;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly ip: string | undefined;
  readonly userAgent: string | undefined;
}

export interface RefreshTokenRepository {
  create(data: CreateRefreshTokenData): Promise<void>;
  findByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  /** Account (role profiles, no password) for the token owner. */
  findAccount(accountId: number): Promise<SafeAccount | null>;
  /** Atomically rotate: revoke `oldHash` (only if still active) and insert the replacement. */
  rotate(oldHash: string, replacement: CreateRefreshTokenData): Promise<boolean>;
  revoke(tokenHash: string): Promise<void>;
  revokeAllForAccount(accountId: number): Promise<void>;
}

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: CreateRefreshTokenData): Promise<void> {
    await this.db.refreshToken.create({
      data: {
        accountId: data.accountId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  }

  findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return this.db.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        accountId: true,
        tokenHash: true,
        expiresAt: true,
        revokedAt: true,
        replacedByTokenHash: true,
      },
    });
  }

  findAccount(accountId: number): Promise<SafeAccount | null> {
    return this.db.userAccount.findUnique({ where: { id: accountId }, ...safeAccountArgs });
  }

  async rotate(oldHash: string, replacement: CreateRefreshTokenData): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      // Conditional revoke: succeeds only if the old token is still active.
      const { count } = await tx.refreshToken.updateMany({
        where: { tokenHash: oldHash, revokedAt: null },
        data: { revokedAt: new Date(), replacedByTokenHash: replacement.tokenHash },
      });
      if (count !== 1) {
        return false; // already rotated/revoked → caller treats as reuse
      }
      await tx.refreshToken.create({
        data: {
          accountId: replacement.accountId,
          tokenHash: replacement.tokenHash,
          expiresAt: replacement.expiresAt,
          ip: replacement.ip ?? null,
          userAgent: replacement.userAgent ?? null,
        },
      });
      return true;
    });
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForAccount(accountId: number): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
