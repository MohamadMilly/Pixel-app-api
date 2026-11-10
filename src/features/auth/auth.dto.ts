import { z } from 'zod';
import type { AccountStatus, UserRole } from '../../generated/prisma/client.js';
import type { SafeAccount } from '../../shared/auth/index.js';

/* ───────────────────────────── Input DTOs ───────────────────────────── */

const username = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Only letters, digits, "_", "." and "-" are allowed');

// bcrypt only uses the first 72 bytes of the password
const newPassword = z.string().min(8).max(72);
const personName = z.string().trim().min(1).max(50);

export const loginDto = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1).max(72),
});
export type LoginDto = z.infer<typeof loginDto>;

export const signupUserDto = z.object({
  username,
  password: newPassword,
  firstname: personName.optional(),
  lastname: personName.optional(),
});
export type SignupUserDto = z.infer<typeof signupUserDto>;

export const refreshTokenDto = z.strictObject({
  refreshToken: z.string().min(1).max(512),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenDto>;

export const logoutDto = z.strictObject({
  refreshToken: z.string().min(1).max(512),
  /** When true, revoke every session of the account, not just this token. */
  allSessions: z.boolean().optional().default(false),
});
export type LogoutDto = z.infer<typeof logoutDto>;

export const signupLibraryDto = signupUserDto.extend({
  title: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  pagePrice: z.number().int().nonnegative(),
  extraFees: z.number().int().nonnegative(),
  planId: z.number().int().positive(),
});
export type SignupLibraryDto = z.infer<typeof signupLibraryDto>;

/* ──────────────────────────── Output presenters ──────────────────────────── */

export interface AccountView {
  readonly accountId: number;
  readonly profileId: number;
  readonly username: string | null;
  readonly firstname: string | null;
  readonly lastname: string | null;
  readonly role: UserRole;
  readonly status: AccountStatus;
  readonly createdAt: Date;
  /** Only present for LIBRARY accounts */
  readonly subscriptionActive?: boolean;
}

export interface AuthTokenView {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  /** Access-token lifetime in seconds. */
  readonly expiresIn: number;
  readonly refreshToken: string;
  /** Refresh-token lifetime in seconds. */
  readonly refreshExpiresIn: number;
  readonly account: AccountView;
}

export interface RefreshedTokenView {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number;
  readonly refreshToken: string;
  readonly refreshExpiresIn: number;
}

export function presentAccount(
  account: Omit<SafeAccount, 'user' | 'admin' | 'library'>,
  profileId: number,
  subscriptionActive?: boolean,
): AccountView {
  return {
    accountId: account.id,
    profileId,
    username: account.username,
    firstname: account.firstname,
    lastname: account.lastname,
    role: account.role,
    status: account.status,
    createdAt: account.createdAt,
    ...(subscriptionActive === undefined ? {} : { subscriptionActive }),
  };
}

export interface IssuedTokens {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly refreshToken: string;
  readonly refreshExpiresIn: number;
}

export function presentAuthToken(tokens: IssuedTokens, account: AccountView): AuthTokenView {
  return {
    accessToken: tokens.accessToken,
    tokenType: 'Bearer',
    expiresIn: tokens.expiresIn,
    refreshToken: tokens.refreshToken,
    refreshExpiresIn: tokens.refreshExpiresIn,
    account,
  };
}

export function presentRefreshedToken(tokens: IssuedTokens): RefreshedTokenView {
  return {
    accessToken: tokens.accessToken,
    tokenType: 'Bearer',
    expiresIn: tokens.expiresIn,
    refreshToken: tokens.refreshToken,
    refreshExpiresIn: tokens.refreshExpiresIn,
  };
}
