import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { visibleLibraryWhere } from '../../shared/domain/subscription.rules.js';
import { idCursorArgs } from '../../shared/pagination/cursor-pagination.js';
import type { OrderByEntry } from '../../shared/pagination/cursor-pagination.js';
import {
  bookDetailArgs,
  type BookDetails,
  type BookUpdateData,
  type BookWriteData,
  type LibraryRates,
  type LinkableFile,
} from './books.entity.js';

export interface BookListArgs {
  readonly categoryId: number | undefined;
  readonly orderBy: OrderByEntry<string>[];
  readonly cursor: number | undefined;
  readonly limit: number;
}

export interface BookSearchArgs {
  readonly term: string;
  readonly limit: number;
  readonly offset: number;
}

export interface DeletedBookFile {
  readonly fileId: number;
  readonly path: string;
}

/** Discriminates "book did not exist" from "book deleted (with/without a file)". */
export type DeleteBookResult = { found: false } | { found: true; file: DeletedBookFile | null };

export interface BooksRepository {
  list(args: BookListArgs): Promise<BookDetails[]>;
  /** Full-text search over the title (tsvector), ranked; offset-paginated. */
  search(args: BookSearchArgs): Promise<BookDetails[]>;
  findById(id: number): Promise<BookDetails | null>;
  /** Live flat rates of a currently-visible library (for pricing), or null. */
  findLibraryRates(libraryId: number, now: Date): Promise<LibraryRates | null>;
  /** Simple direct query of the files table (allowed to duplicate; not a cross-feature import). */
  findFileById(fileId: number): Promise<LinkableFile | null>;
  /** True if the file is already attached to a book (optionally excluding one book). */
  isFileLinked(fileId: number, exceptBookId?: number): Promise<boolean>;
  deleteFileById(fileId: number): Promise<void>;
  create(data: BookWriteData): Promise<BookDetails>;
  update(id: number, data: BookUpdateData): Promise<BookDetails>;
  /**
   * Delete the book and its file row in one transaction; the result says whether the
   * book existed and, if so, the object path to remove from the bucket.
   */
  deleteWithFile(id: number): Promise<DeleteBookResult>;
}

export class PrismaBooksRepository implements BooksRepository {
  constructor(private readonly db: PrismaClient) {}

  list(args: BookListArgs): Promise<BookDetails[]> {
    return this.db.book.findMany({
      where: buildWhere(args.categoryId),
      orderBy: args.orderBy,
      ...idCursorArgs(args.cursor, args.limit),
      ...bookDetailArgs,
    });
  }

  async search(args: BookSearchArgs): Promise<BookDetails[]> {
    // Parameterized tsvector query (values bound as $1.. — never string-interpolated).
    const ranked = await this.db.$queryRaw<Array<{ id: number }>>`
      SELECT "id" FROM "Book"
      WHERE "searchVector" @@ websearch_to_tsquery('simple', ${args.term})
      ORDER BY ts_rank("searchVector", websearch_to_tsquery('simple', ${args.term})) DESC, "id" ASC
      LIMIT ${args.limit} OFFSET ${args.offset}`;

    const ids = ranked.map((r) => r.id);
    if (ids.length === 0) return [];

    const books = await this.db.book.findMany({ where: { id: { in: ids } }, ...bookDetailArgs });
    const byId = new Map(books.map((b) => [b.id, b]));
    // Preserve the rank order returned by the raw query.
    return ids.map((id) => byId.get(id)).filter((b): b is BookDetails => b !== undefined);
  }

  findById(id: number): Promise<BookDetails | null> {
    return this.db.book.findUnique({ where: { id }, ...bookDetailArgs });
  }

  findLibraryRates(libraryId: number, now: Date): Promise<LibraryRates | null> {
    return this.db.library.findFirst({
      where: { id: libraryId, ...visibleLibraryWhere(now) },
      select: { pagePrice: true, extraFees: true },
    });
  }

  findFileById(fileId: number): Promise<LinkableFile | null> {
    return this.db.file.findUnique({
      where: { id: fileId },
      select: { id: true, path: true, status: true, mimeType: true },
    });
  }

  async isFileLinked(fileId: number, exceptBookId?: number): Promise<boolean> {
    const book = await this.db.book.findFirst({
      where: { fileId, ...(exceptBookId === undefined ? {} : { id: { not: exceptBookId } }) },
      select: { id: true },
    });
    return book !== null;
  }

  async deleteFileById(fileId: number): Promise<void> {
    await this.db.file.delete({ where: { id: fileId } });
  }

  create(data: BookWriteData): Promise<BookDetails> {
    return this.db.book.create({
      data: {
        title: data.title,
        pages: data.pages,
        thumbnailUrl: data.thumbnailUrl,
        file: { connect: { id: data.fileId } },
        categories: { connect: data.categoryIds.map((id) => ({ id })) },
      },
      ...bookDetailArgs,
    });
  }

  update(id: number, data: BookUpdateData): Promise<BookDetails> {
    return this.db.book.update({
      where: { id },
      data: {
        ...(data.title === undefined ? {} : { title: data.title }),
        ...(data.pages === undefined ? {} : { pages: data.pages }),
        ...(data.thumbnailUrl === undefined ? {} : { thumbnailUrl: data.thumbnailUrl }),
        ...(data.fileId === undefined ? {} : { file: { connect: { id: data.fileId } } }),
        ...(data.categoryIds === undefined ? {} : { categories: { set: data.categoryIds.map((id) => ({ id })) } }),
      },
      ...bookDetailArgs,
    });
  }

  async deleteWithFile(id: number): Promise<DeleteBookResult> {
    return this.db.$transaction(async (tx): Promise<DeleteBookResult> => {
      const book = await tx.book.findUnique({ where: { id }, select: { id: true, fileId: true } });
      if (!book) {
        return { found: false };
      }
      // Delete the book first (it references the file via Restrict), then the file row.
      await tx.book.delete({ where: { id } });
      if (book.fileId === null) {
        return { found: true, file: null };
      }
      const file = await tx.file.findUnique({ where: { id: book.fileId }, select: { path: true } });
      await tx.file.delete({ where: { id: book.fileId } });
      return { found: true, file: file ? { fileId: book.fileId, path: file.path } : null };
    });
  }
}

function buildWhere(categoryId: number | undefined): Prisma.BookWhereInput {
  return categoryId === undefined ? {} : { categories: { some: { id: categoryId } } };
}
