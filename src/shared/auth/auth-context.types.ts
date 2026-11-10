import type { Admin, Library, Prisma, User } from '../../generated/prisma/client.js';

/** Account loaded with every role profile and WITHOUT the password hash. */
export const safeAccountArgs = {
  omit: { password: true },
  include: { user: true, admin: true, library: true },
} satisfies Prisma.UserAccountDefaultArgs;

export type SafeAccount = Prisma.UserAccountGetPayload<typeof safeAccountArgs>;

interface AuthContextBase {
  readonly account: SafeAccount;
  readonly accountId: number;
  /** Role-specific profile id (User.id / Library.id / Admin.id) */
  readonly profileId: number;
}

export interface UserAuthContext extends AuthContextBase {
  readonly role: 'USER';
  readonly user: User;
}

export interface LibraryAuthContext extends AuthContextBase {
  readonly role: 'LIBRARY';
  readonly library: Library;
  readonly hasActiveSubscription: boolean;
}

export interface AdminAuthContext extends AuthContextBase {
  readonly role: 'ADMIN';
  readonly admin: Admin;
}

/** Discriminated union: narrow with `ctx.role === 'USER'` etc. */
export type AuthContext = UserAuthContext | LibraryAuthContext | AdminAuthContext;
export type AuthRole = AuthContext['role'];
export type AuthContextOf<R extends AuthRole> = Extract<AuthContext, { role: R }>;
