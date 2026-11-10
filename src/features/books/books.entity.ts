import type { Prisma } from '../../generated/prisma/client.js';

export const bookDetailArgs = {
  include: {
    file: { select: { id: true, path: true, status: true, mimeType: true, size: true } },
    categories: { select: { id: true, name: true } },
  },
} satisfies Prisma.BookDefaultArgs;

export type BookDetails = Prisma.BookGetPayload<typeof bookDetailArgs>;

export const BOOK_SORT_FIELDS = ['id', 'title', 'pages', 'avgRating', 'createdAt'] as const;
export type BookSortField = (typeof BOOK_SORT_FIELDS)[number];

/** Live per-library flat rates, used to price a book for a specific library. */
export interface LibraryRates {
  readonly pagePrice: number;
  readonly extraFees: number;
}

export interface BookPrice {
  readonly libraryId: number;
  readonly pageCount: number;
  readonly pagePrice: number;
  readonly extraFees: number;
  readonly total: number;
}

/** Compute the price of printing a book at a library (flat per-library rate). */
export function priceBookAtLibrary(libraryId: number, pages: number, rates: LibraryRates): BookPrice {
  return {
    libraryId,
    pageCount: pages,
    pagePrice: rates.pagePrice,
    extraFees: rates.extraFees,
    total: pages * rates.pagePrice + rates.extraFees,
  };
}

export interface BookWriteData {
  readonly title: string;
  readonly pages: number;
  readonly thumbnailUrl: string | null;
  readonly fileId: number;
  readonly categoryIds: readonly number[];
}

export type BookUpdateData = Partial<Omit<BookWriteData, 'fileId'>> & { readonly fileId?: number };

/** Minimal projection of a linkable file (used when attaching a file to a book). */
export interface LinkableFile {
  readonly id: number;
  readonly path: string;
  readonly status: 'PENDING' | 'CHECKED';
  readonly mimeType: string | null;
}
