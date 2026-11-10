import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AccountStatus, UserRole } from '../../generated/prisma/client.js';
import { UnauthorizedError } from '../errors/index.js';

/**
 * JWT payload contract.
 *  - `id`        → role-specific profile id (User.id / Library.id / Admin.id)
 *  - `accountId` → UserAccount.id
 * The payload is only a hint: the authenticate middleware always re-loads
 * the account from the database before trusting it.
 */
const accessTokenPayloadSchema = z.object({
  id: z.number().int().positive(),
  accountId: z.number().int().positive(),
  role: z.enum(UserRole),
  status: z.enum(AccountStatus),
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

const ALGORITHM = 'HS256';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid access token', 'TOKEN_INVALID');
  }

  const parsed = accessTokenPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new UnauthorizedError('Malformed access token payload', 'TOKEN_INVALID');
  }
  return parsed.data;
}

/** Extract the token from an `Authorization: Bearer <token>` header value. */
export function extractBearerToken(headerValue: string | undefined): string {
  if (!headerValue) {
    throw new UnauthorizedError('Missing Authorization header');
  }
  const [scheme, token] = headerValue.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new UnauthorizedError('Authorization header must be "Bearer <token>"');
  }
  return token.trim();
}
