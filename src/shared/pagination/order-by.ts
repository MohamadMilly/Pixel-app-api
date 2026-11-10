import type { SortOrder } from '../../types/api.types.js';
import { orderByWithTiebreaker, type OrderByEntry } from './cursor-pagination.js';

export interface ParsedOrderBy<F extends string> {
  readonly field: F;
  readonly direction: SortOrder;
}

/**
 * Parse an `orderBy` query value using the `±field` convention:
 *   `createdAt` or `+createdAt` → ascending, `-createdAt` → descending.
 * Unknown/missing fields fall back to the provided default — the controller layer
 * turns an untrusted string into a validated { field, direction } pair, and the
 * repository turns that into the Prisma `orderBy` object (kept separate on purpose).
 */
export function parseOrderBy<const F extends string>(
  value: string | undefined,
  allowed: readonly F[],
  fallback: ParsedOrderBy<F>,
): ParsedOrderBy<F> {
  if (!value) return fallback;
  const direction: SortOrder = value.startsWith('-') ? 'desc' : 'asc';
  const field = value.replace(/^[+-]/, '') as F;
  return allowed.includes(field) ? { field, direction } : fallback;
}

/** Turn a parsed order into the Prisma `orderBy` array (with id tiebreaker). */
export function toPrismaOrderBy<F extends string>(parsed: ParsedOrderBy<F>): OrderByEntry<F>[] {
  return orderByWithTiebreaker(parsed.field, parsed.direction);
}
