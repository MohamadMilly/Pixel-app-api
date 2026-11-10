import { describe, expect, it } from '@jest/globals';
import { signAccessToken, verifyAccessToken, extractBearerToken } from '../../src/shared/security/jwt.js';
import { hashPassword, verifyPassword } from '../../src/shared/security/password.js';

const payload = { id: 7, accountId: 42, role: 'USER', status: 'ACTIVE' } as const;

describe('access token', () => {
  it('round-trips a valid payload', () => {
    const token = signAccessToken({ ...payload });
    const decoded = verifyAccessToken(token);
    expect(decoded).toMatchObject(payload);
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken({ ...payload });
    expect(() => verifyAccessToken(token + 'x')).toThrow();
  });

  it('rejects a token signed with another secret', () => {
    // A clearly-invalid token string must not verify.
    expect(() => verifyAccessToken('not.a.jwt')).toThrow();
  });

  it('extracts a Bearer token and rejects a malformed header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(() => extractBearerToken(undefined)).toThrow();
    expect(() => extractBearerToken('Basic abc')).toThrow();
  });
});

describe('password hashing', () => {
  it('verifies the correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(await verifyPassword('wrong password', hash)).toBe(false);
  });
});
