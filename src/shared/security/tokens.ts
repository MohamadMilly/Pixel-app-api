import { createHash, randomBytes } from 'node:crypto';

/**
 * Opaque refresh tokens: a cryptographically random value handed to the client,
 * of which only the SHA-256 hash is ever stored. Lookups hash the presented token
 * and compare — the raw token is never persisted, so a DB leak cannot be replayed.
 */
export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
