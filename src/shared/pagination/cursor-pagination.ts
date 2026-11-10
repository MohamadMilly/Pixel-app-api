import { z } from 'zod';
import type { Paginated, SortOrder } from '../../types/api.types.js';

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Base query schema shared by every list endpoint.
 * Features extend it with their own `sortBy` enum and filters:
 *
 *   const listBooksQuery = paginationQuerySchema.extend({
 *     sortBy: sortBySchema(['id', 'title', 'pages'], 'id'),
 *     title: z.string().optional(),
 *   });
 */
export const paginationQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function sortBySchema<const TFields extends readonly [string, ...string[]]>(
  fields: TFields,
  defaultField: TFields[number],
) {
  return z.enum(fields).default(defaultField);
}

export interface IdCursorArgs {
  take: number;
  skip?: number;
  cursor?: { id: number };
}

/**
 * Prisma cursor arguments. We fetch `limit + 1` rows to know whether a next page exists.
 * Always combine with an `orderBy` that ends with `{ id }` as a tie-breaker so the order is total.
 */
export function idCursorArgs(cursor: number | undefined, limit: number): IdCursorArgs {
  return cursor === undefined ? { take: limit + 1 } : { take: limit + 1, skip: 1, cursor: { id: cursor } };
}

/** Trim the extra row and compute page info. */
export function buildPage<T, TCursor>(
  rows: T[],
  limit: number,
  getCursor: (row: T) => TCursor,
): Paginated<T, TCursor> {
  const hasNextPage = rows.length > limit;
  const data = hasNextPage ? rows.slice(0, limit) : rows;
  const last = data.at(-1);

  return {
    data,
    pageInfo: {
      limit,
      hasNextPage,
      nextCursor: hasNextPage && last !== undefined ? getCursor(last) : null,
    },
  };
}

/**
 * Build a Prisma `orderBy` with `id` as tie-breaker (required for stable cursor pagination).
 * `K` must be a scalar field of the model; the result is assignable to `<Model>OrderByWithRelationInput[]`.
 */
export type OrderByEntry<K extends string> = { [P in K | 'id']?: SortOrder };

export function orderByWithTiebreaker<const K extends string>(field: K, order: SortOrder): OrderByEntry<K>[] {
  const primary = { [field]: order } as OrderByEntry<K>;
  if (field === 'id') return [primary];
  const tiebreaker = { id: order } as OrderByEntry<K>;
  return [primary, tiebreaker];
}

/** Map every element of a page through a presenter, keeping page info. */
export function mapPage<T, U, TCursor>(page: Paginated<T, TCursor>, fn: (item: T) => U): Paginated<U, TCursor> {
  return { data: page.data.map(fn), pageInfo: page.pageInfo };
}
