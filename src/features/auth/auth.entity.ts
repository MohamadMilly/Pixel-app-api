import type { Plan, Prisma, UserRole } from '../../generated/prisma/client.js';

/** Account WITH the password hash — only ever used inside the auth slice for login. */
export const accountWithCredentialsArgs = {
  include: { user: true, admin: true, library: true },
} satisfies Prisma.UserAccountDefaultArgs;

export type AccountWithCredentials = Prisma.UserAccountGetPayload<typeof accountWithCredentialsArgs>;

export type LoginRole = UserRole;

export interface NewAccountData {
  readonly username: string;
  readonly passwordHash: string;
  readonly firstname: string | undefined;
  readonly lastname: string | undefined;
}

export interface NewLibraryData extends NewAccountData {
  readonly title: string;
  readonly location: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly pagePrice: number;
  readonly extraFees: number;
  /** Plan the library is requesting; a pending Subscription is created with a duration snapshot. */
  readonly plan: Pick<Plan, 'id' | 'durationDays'>;
}
