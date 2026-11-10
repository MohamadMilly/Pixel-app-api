import { describe, expect, it } from '@jest/globals';
import {
  ORDER_ACTION_ROLE,
  canTransition,
  computePriceSnapshot,
  transitionFor,
} from '../../src/features/orders/orders.entity.js';

describe('order state machine', () => {
  it('allows only the defined transitions', () => {
    expect(canTransition('accept', 'PENDING')).toBe(true);
    expect(canTransition('reject', 'PENDING')).toBe(true);
    expect(canTransition('fulfill', 'ACCEPTED')).toBe(true);
    expect(canTransition('receive', 'FULFILLED')).toBe(true);
    expect(canTransition('cancel', 'PENDING')).toBe(true);
    expect(canTransition('cancel', 'ACCEPTED')).toBe(true);
  });

  it('rejects out-of-order transitions', () => {
    expect(canTransition('receive', 'PENDING')).toBe(false); // can't receive before fulfill
    expect(canTransition('fulfill', 'PENDING')).toBe(false); // can't fulfill before accept
    expect(canTransition('accept', 'ACCEPTED')).toBe(false); // already accepted
    expect(canTransition('cancel', 'FULFILLED')).toBe(false); // too late to cancel
    expect(canTransition('cancel', 'RECEIVED')).toBe(false);
    expect(canTransition('accept', 'CANCELLED')).toBe(false); // terminal
  });

  it('maps each action to the correct target status', () => {
    expect(transitionFor('accept').to).toBe('ACCEPTED');
    expect(transitionFor('reject').to).toBe('REJECTED');
    expect(transitionFor('fulfill').to).toBe('FULFILLED');
    expect(transitionFor('cancel').to).toBe('CANCELLED');
    expect(transitionFor('receive').to).toBe('RECEIVED');
  });

  it('assigns actions to the correct role', () => {
    expect(ORDER_ACTION_ROLE.accept).toBe('LIBRARY');
    expect(ORDER_ACTION_ROLE.reject).toBe('LIBRARY');
    expect(ORDER_ACTION_ROLE.fulfill).toBe('LIBRARY');
    expect(ORDER_ACTION_ROLE.cancel).toBe('USER');
    expect(ORDER_ACTION_ROLE.receive).toBe('USER');
  });
});

describe('price snapshot (flat per-library rate)', () => {
  it('computes totalPrice = pages * pagePrice + extraFees', () => {
    expect(computePriceSnapshot(10, 5, 3)).toEqual({
      pageCount: 10,
      snapshotPagePrice: 5,
      snapshotExtraFees: 3,
      totalPrice: 53,
    });
  });

  it('handles zero fees', () => {
    expect(computePriceSnapshot(100, 2, 0).totalPrice).toBe(200);
  });
});
