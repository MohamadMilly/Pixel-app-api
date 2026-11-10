import { describe, expect, it } from '@jest/globals';
import { buildPage, orderByWithTiebreaker } from '../../src/shared/pagination/cursor-pagination.js';

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

describe('buildPage', () => {
  it('signals a next page and trims the extra row', () => {
    const page = buildPage(rows(6), 5, (r) => r.id);
    expect(page.data).toHaveLength(5);
    expect(page.pageInfo.hasNextPage).toBe(true);
    expect(page.pageInfo.nextCursor).toBe(5); // id of the last kept row
    expect(page.pageInfo.limit).toBe(5);
  });

  it('reports no next page when rows fit within the limit', () => {
    const page = buildPage(rows(3), 5, (r) => r.id);
    expect(page.data).toHaveLength(3);
    expect(page.pageInfo.hasNextPage).toBe(false);
    expect(page.pageInfo.nextCursor).toBeNull();
  });

  it('handles an empty result', () => {
    const page = buildPage(rows(0), 5, (r) => r.id);
    expect(page.data).toHaveLength(0);
    expect(page.pageInfo.hasNextPage).toBe(false);
    expect(page.pageInfo.nextCursor).toBeNull();
  });
});

describe('orderByWithTiebreaker', () => {
  it('appends id as a tiebreaker for non-id fields', () => {
    expect(orderByWithTiebreaker('title', 'asc')).toEqual([{ title: 'asc' }, { id: 'asc' }]);
  });

  it('does not duplicate when sorting by id', () => {
    expect(orderByWithTiebreaker('id', 'desc')).toEqual([{ id: 'desc' }]);
  });
});
