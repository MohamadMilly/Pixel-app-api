import { describe, expect, it } from '@jest/globals';
import { Permission, hasPermission } from '../../src/shared/rbac/permissions.js';

describe('RBAC permission map', () => {
  it('grants admins management permissions', () => {
    expect(hasPermission('ADMIN', Permission.ACCOUNT_BAN)).toBe(true);
    expect(hasPermission('ADMIN', Permission.SUBSCRIPTION_ACTIVATE)).toBe(true);
    expect(hasPermission('ADMIN', Permission.BOOK_CREATE)).toBe(true);
    expect(hasPermission('ADMIN', Permission.AUDIT_READ)).toBe(true);
    expect(hasPermission('ADMIN', Permission.FILE_WRITE)).toBe(true);
  });

  it('does not let users ban accounts or manage books', () => {
    expect(hasPermission('USER', Permission.ACCOUNT_BAN)).toBe(false);
    expect(hasPermission('USER', Permission.BOOK_CREATE)).toBe(false);
    expect(hasPermission('USER', Permission.SUBSCRIPTION_ACTIVATE)).toBe(false);
  });

  it('gives users ordering + rating permissions only', () => {
    expect(hasPermission('USER', Permission.ORDER_CREATE)).toBe(true);
    expect(hasPermission('USER', Permission.RATING_BOOK_WRITE)).toBe(true);
    expect(hasPermission('USER', Permission.ORDER_ACCEPT)).toBe(false); // library action
  });

  it('gives libraries fulfillment permissions but never ordering', () => {
    expect(hasPermission('LIBRARY', Permission.ORDER_ACCEPT)).toBe(true);
    expect(hasPermission('LIBRARY', Permission.ORDER_FULFILL)).toBe(true);
    expect(hasPermission('LIBRARY', Permission.ORDER_CREATE)).toBe(false);
    expect(hasPermission('LIBRARY', Permission.BOOK_CREATE)).toBe(false);
  });
});
