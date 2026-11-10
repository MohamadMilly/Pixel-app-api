import { env } from '../../config/env.js';
import type { AdminAuthContext, AuthContext } from '../../shared/auth/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/index.js';
import type { DomainEventBus } from '../../shared/events/domain-events.js';
import { buildPage } from '../../shared/pagination/cursor-pagination.js';
import { parseOrderBy, toPrismaOrderBy } from '../../shared/pagination/order-by.js';
import type { StoragePort } from '../../shared/storage/index.js';
import type { Paginated } from '../../types/api.types.js';
import {
  presentBookPrivileged,
  presentBookPublic,
  type BookPrivilegedView,
  type BookPublicView,
  type CreateBookDto,
  type GetBookQuery,
  type ListBooksQuery,
  type UpdateBookDto,
} from './books.dto.js';
import { BOOK_SORT_FIELDS, priceBookAtLibrary, type BookDetails, type BookPrice } from './books.entity.js';
import { bookPolicy } from './books.policy.js';
import type { BooksRepository } from './books.repository.js';

type AnyBookView = BookPublicView | BookPrivilegedView;

export class BooksService {
  constructor(
    private readonly repository: BooksRepository,
    private readonly storage: StoragePort,
    private readonly events: DomainEventBus,
  ) {}

  /** Public list: `?search=` (tsvector), `?category=` (single), `?orderBy=±field`. */
  async list(actor: AuthContext | undefined, query: ListBooksQuery): Promise<Paginated<AnyBookView>> {
    if (query.search) {
      // Ranked full-text search: cursor is used as an offset.
      const offset = query.cursor ?? 0;
      const rows = await this.repository.search({ term: query.search, limit: query.limit + 1, offset });
      const hasNextPage = rows.length > query.limit;
      const slice = hasNextPage ? rows.slice(0, query.limit) : rows;
      return {
        data: await this.presentMany(actor, slice),
        pageInfo: { limit: query.limit, hasNextPage, nextCursor: hasNextPage ? offset + query.limit : null },
      };
    }

    const parsed = parseOrderBy(query.orderBy, BOOK_SORT_FIELDS, { field: 'id', direction: 'desc' });
    const rows = await this.repository.list({
      categoryId: query.category,
      orderBy: toPrismaOrderBy(parsed),
      cursor: query.cursor,
      limit: query.limit,
    });
    const page = buildPage(rows, query.limit, (book) => book.id);
    return { data: await this.presentMany(actor, page.data), pageInfo: page.pageInfo };
  }

  async getById(actor: AuthContext | undefined, bookId: number, query: GetBookQuery): Promise<AnyBookView> {
    const book = await this.repository.findById(bookId);
    if (!book) throw new NotFoundError('Book');

    let price: BookPrice | undefined;
    if (query.libraryId !== undefined) {
      const rates = await this.repository.findLibraryRates(query.libraryId, new Date());
      if (rates) {
        price = priceBookAtLibrary(query.libraryId, book.pages, rates);
      }
    }
    return this.present(actor, book, price);
  }

  async create(admin: AdminAuthContext, dto: CreateBookDto): Promise<BookPrivilegedView> {
    await this.assertFileLinkable(dto.fileId);
    const book = await this.repository.create({
      title: dto.title,
      pages: dto.pages,
      thumbnailUrl: dto.thumbnailUrl,
      fileId: dto.fileId,
      categoryIds: dto.categoryIds,
    });
    this.events.emit('book.created', { bookId: book.id, byAdminId: admin.profileId });
    return this.presentPrivileged(book);
  }

  async update(admin: AdminAuthContext, bookId: number, dto: UpdateBookDto): Promise<BookPrivilegedView> {
    const current = await this.repository.findById(bookId);
    if (!current) throw new NotFoundError('Book');

    const replacingFile = dto.fileId !== undefined && dto.fileId !== current.fileId;
    if (replacingFile) {
      await this.assertFileLinkable(dto.fileId as number, bookId);
    }

    const updated = await this.repository.update(bookId, {
      title: dto.title,
      pages: dto.pages,
      thumbnailUrl: dto.thumbnailUrl,
      categoryIds: dto.categoryIds,
      ...(replacingFile ? { fileId: dto.fileId } : {}),
    });

    if (replacingFile && current.file) {
      await this.removeFileSafely(current.file.id, current.file.path);
    }
    this.events.emit('book.updated', { bookId: updated.id, byAdminId: admin.profileId });
    return this.presentPrivileged(updated);
  }

  async delete(admin: AdminAuthContext, bookId: number): Promise<void> {
    const result = await this.repository.deleteWithFile(bookId);
    if (!result.found) {
      throw new NotFoundError('Book');
    }
    if (result.file) {
      await this.storage.removeObject(result.file.path).catch((error: unknown) => {
        console.error(`[books] failed to remove object ${result.file?.path}`, error);
      });
    }
    this.events.emit('book.deleted', { bookId, byAdminId: admin.profileId });
  }

  /* ───────────────────────── helpers ───────────────────────── */

  private async assertFileLinkable(fileId: number, exceptBookId?: number): Promise<void> {
    const file = await this.repository.findFileById(fileId);
    if (!file) throw new NotFoundError('File', 'FILE_NOT_FOUND');
    if (file.status !== 'CHECKED') {
      throw new BadRequestError('File has not passed verification', 'FILE_NOT_CHECKED');
    }
    if (file.mimeType !== 'application/pdf') {
      throw new BadRequestError('Linked file must be a PDF', 'INVALID_FILE_TYPE');
    }
    if (await this.repository.isFileLinked(fileId, exceptBookId)) {
      throw new ConflictError('File is already linked to another book', 'FILE_ALREADY_LINKED');
    }
  }

  private async removeFileSafely(fileId: number, path: string): Promise<void> {
    await this.repository.deleteFileById(fileId).catch(() => undefined);
    await this.storage.removeObject(path).catch((error: unknown) => {
      console.error(`[books] failed to remove object ${path}`, error);
    });
  }

  private present(actor: AuthContext | undefined, book: BookDetails, price?: BookPrice): Promise<AnyBookView> {
    return bookPolicy.canSeeFile(actor)
      ? this.presentPrivileged(book, price)
      : Promise.resolve(presentBookPublic(book, price));
  }

  private async presentMany(actor: AuthContext | undefined, books: BookDetails[]): Promise<AnyBookView[]> {
    if (!bookPolicy.canSeeFile(actor)) {
      return books.map((b) => presentBookPublic(b));
    }
    return Promise.all(books.map((book) => this.presentPrivileged(book)));
  }

  private async presentPrivileged(book: BookDetails, price?: BookPrice): Promise<BookPrivilegedView> {
    const signedUrl = await this.signIfAvailable(book.file);
    return presentBookPrivileged(book, signedUrl, price);
  }

  private async signIfAvailable(file: BookDetails['file']): Promise<string | null> {
    if (!file || file.status !== 'CHECKED') return null;
    try {
      return await this.storage.createSignedDownloadUrl(file.path, env.SIGNED_URL_TTL_SECONDS);
    } catch {
      return null;
    }
  }
}
