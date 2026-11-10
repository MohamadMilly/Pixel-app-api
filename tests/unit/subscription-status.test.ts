import { describe, expect, it } from '@jest/globals';
import { deriveSubscriptionStatus } from '../../src/features/subscriptions/subscriptions.entity.js';

const now = new Date('2026-06-01T00:00:00Z');
const past = new Date('2026-05-01T00:00:00Z');
const future = new Date('2026-07-01T00:00:00Z');

describe('deriveSubscriptionStatus', () => {
  it('is PENDING before activation', () => {
    expect(deriveSubscriptionStatus({ activatedAt: null, expiresAt: null }, now)).toBe('PENDING');
  });

  it('is ACTIVE when activated in the past and not yet expired', () => {
    expect(deriveSubscriptionStatus({ activatedAt: past, expiresAt: future }, now)).toBe('ACTIVE');
  });

  it('is SCHEDULED when activation starts in the future (stacked renewal)', () => {
    expect(deriveSubscriptionStatus({ activatedAt: future, expiresAt: future }, now)).toBe('SCHEDULED');
  });

  it('is EXPIRED once past expiry', () => {
    expect(deriveSubscriptionStatus({ activatedAt: past, expiresAt: past }, now)).toBe('EXPIRED');
  });
});
