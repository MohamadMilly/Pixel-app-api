import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination/cursor-pagination.js';
import { idParamsSchema } from '../../shared/validation/parse-input.js';
import { type BookDetails, type BookPrice } from './books.entity.js';

/* ───────────────────────────── Input DTOs ───────────────────────────── */

export const bookIdParams = idParamsSchema('bookId');

export const listBooksQuery = paginationQuerySchema.pick({ cursor: true, limit: true }).extend({
  // `±field` convention, e.g. ?orderBy=-createdAt (desc) or ?orderBy=title (asc).
  orderBy: z.string().trim().max(40).optional(),
  // A SINGLE category id (search is deliberately one category, not several at once).
  category: z.coerce.number().int().positive().optional(),
  // Full-text search over the book title (tsvector).
  search: z.string().trim().min(1).max(200).optional(),
});
export type ListBooksQuery = z.infer<typeof listBooksQuery>;

/** GET /books/:bookId may include ?libraryId= to price the book for that library. */
export const getBookQuery = z.object({
  libraryId: z.coerce.number().int().positive().optional(),
});
export type GetBookQuery = z.infer<typeof getBookQuery>;

const bookFields = {
  title: z.string().trim().min(1).max(200),
  pages: z.number().int().min(1).max(100_000),
  thumbnailUrl: z.string().url().max(2048).nullable(),
  categoryIds: z.array(z.number().int().positive()).max(50),
};

export const createBookDto = z.strictObject({
  title: bookFields.title,
  pages: bookFields.pages,
  thumbnailUrl: bookFields.thumbnailUrl.optional().default(null),
  fileId: z.number().int().positive(),
  categoryIds: bookFields.categoryIds.optional().default([]),
});
export type CreateBookDto = z.infer<typeof createBookDto>;

export const updateBookDto = z
  .strictObject({
    title: bookFields.title,
    pages: bookFields.pages,
    thumbnailUrl: bookFields.thumbnailUrl,
    categoryIds: bookFields.categoryIds,
    // Optionally replace the linked file.
    fileId: z.number().int().positive(),
  })
  .partial()
  .refine((dto) => Object.keys(dto).length > 0, { message: 'At least one field must be provided' });
export type UpdateBookDto = z.infer<typeof updateBookDto>;

/* ──────────────────────────── Output presenters ──────────────────────────── */

interface CategoryView {
  readonly id: number;
  readonly name: string;
}

/** What EVERY caller may see — never contains file path, file id, or signed URL. */
export interface BookPublicView {
  readonly id: number;
  readonly title: string;
  readonly pages: number;
  readonly thumbnailUrl: string | null;
  readonly avgRating: number;
  readonly ratingCount: number;
  readonly categories: CategoryView[];
  readonly hasFile: boolean;
  /** Present only on GET /books/:id?libraryId= — the computed price at that library. */
  readonly price?: BookPrice;
}

/** Privileged view (ADMIN / LIBRARY only) — adds the file reference + temporary signed URL. */
export interface BookPrivilegedView extends BookPublicView {
  readonly file: {
    readonly id: number;
    readonly status: string;
    readonly mimeType: string | null;
    readonly size: number | null;
    /** Temporary Supabase signed URL; null if the file isn't verified/available. */
    readonly signedUrl: string | null;
  } | null;
}

export function presentBookPublic(book: BookDetails, price?: BookPrice): BookPublicView {
  return {
    id: book.id,
    title: book.title,
    pages: book.pages,
    thumbnailUrl: book.thumbnailUrl,
    avgRating: book.avgRating,
    ratingCount: book.ratingCount,
    categories: book.categories.map((c) => ({ id: c.id, name: c.name })),
    hasFile: book.fileId !== null,
    ...(price ? { price } : {}),
  };
}

export function presentBookPrivileged(book: BookDetails, signedUrl: string | null, price?: BookPrice): BookPrivilegedView {
  return {
    ...presentBookPublic(book, price),
    file: book.file
      ? {
          id: book.file.id,
          status: book.file.status,
          mimeType: book.file.mimeType,
          size: book.file.size,
          signedUrl,
        }
      : null,
  };
}
