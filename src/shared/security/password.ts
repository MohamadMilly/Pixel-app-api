import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A real bcrypt hash compared against when the username does not exist,
 * so "unknown user" and "wrong password" take the same time (prevents user enumeration).
 */
let dummyHash: Promise<string> | undefined;
export function getDummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword('timing-attack-mitigation-dummy-password');
  return dummyHash;
}
