import { env } from '../../config/env.js';
import type { AuthContext, LibraryAuthContext } from '../../shared/auth/index.js';
import { NotFoundError } from '../../shared/errors/index.js';
import { buildPage } from '../../shared/pagination/cursor-pagination.js';
import type { Paginated } from '../../types/api.types.js';
import {
  presentLibrary,
  presentMapMarker,
  type LibraryMapResponse,
  type LibraryPublicView,
  type ListLibrariesQuery,
  type MapQuery,
  type UpdateLibraryDto,
} from './libraries.dto.js';
import {
  clampBoundingBox,
  priceBookForLibrary,
  type LibraryBookPrice,
  type LibraryDetails,
} from './libraries.entity.js';
import { libraryPolicy } from './libraries.policy.js';
import type { LibrariesRepository } from './libraries.repository.js';

export class LibrariesService {
  constructor(private readonly repository: LibrariesRepository) {}

  async list(actor: AuthContext, query: ListLibrariesQuery): Promise<Paginated<LibraryPublicView>> {
    const now = new Date();
    // If ?bookId= is set, resolve the book's page count once and price it per library.
    const bookPages = await this.resolveBookPages(query.bookId);
    const priceFor = (library: LibraryDetails): LibraryBookPrice | undefined =>
      this.priceBook(query.bookId, bookPages, library.pagePrice, library.extraFees);

    // Full-text search path (visible libraries only; cursor used as an offset).
    if (query.search) {
      const offset = query.cursor ?? 0;
      const rows = await this.repository.searchVisible({ term: query.search, limit: query.limit + 1, offset, now });
      const hasNextPage = rows.length > query.limit;
      const slice = hasNextPage ? rows.slice(0, query.limit) : rows;
      return {
        data: slice.map((l) => presentLibrary(l, priceFor(l))),
        pageInfo: { limit: query.limit, hasNextPage, nextCursor: hasNextPage ? offset + query.limit : null },
      };
    }

    const includeHidden = libraryPolicy.mayIncludeHidden(actor, query.includeHidden);

    const rows = await this.repository.list({
      filter: { title: query.title, maxPagePrice: query.maxPagePrice, includeHidden, now },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    const page = buildPage(rows, query.limit, (library) => library.id);
    return { data: page.data.map((l) => presentLibrary(l, priceFor(l))), pageInfo: page.pageInfo };
  }

  /**
   * Map markers inside a bounding box.
   * The box is clamped to the configured maximum span (never rejected), and the
   * number of markers is hard-capped at MAP_MAX_RESULTS to protect memory/latency.
   */
  async map(_actor: AuthContext, query: MapQuery): Promise<LibraryMapResponse> {
    const now = new Date();
    const { box, clamped } = clampBoundingBox(
      { minLat: query.minLat, maxLat: query.maxLat, minLng: query.minLng, maxLng: query.maxLng },
      env.MAP_MAX_LAT_SPAN,
      env.MAP_MAX_LNG_SPAN,
    );

    // Fetch one extra row to detect whether the cap truncated the result.
    const probe = env.MAP_MAX_RESULTS + 1;
    const rows = await this.repository.findInBoundingBox({ box, limit: probe, now });

    const bookPages = await this.resolveBookPages(query.bookId);
    const truncated = rows.length > env.MAP_MAX_RESULTS;
    const kept = truncated ? rows.slice(0, env.MAP_MAX_RESULTS) : rows;
    const markers = kept.map((l) =>
      presentMapMarker(l, this.priceBook(query.bookId, bookPages, l.pagePrice, l.extraFees)),
    );

    return {
      markers,
      count: markers.length,
      truncated,
      boundingBoxClamped: clamped,
      effectiveBoundingBox: box,
    };
  }

  async getById(actor: AuthContext, libraryId: number): Promise<LibraryPublicView> {
    return presentLibrary(await this.resolveViewable(actor, libraryId));
  }

  /** Resolve a book's page count once per request (or undefined when no bookId / unknown book). */
  private async resolveBookPages(bookId: number | undefined): Promise<number | undefined> {
    if (bookId === undefined) return undefined;
    return (await this.repository.findBookPages(bookId)) ?? undefined;
  }

  private priceBook(
    bookId: number | undefined,
    pages: number | undefined,
    pagePrice: number,
    extraFees: number,
  ): LibraryBookPrice | undefined {
    if (bookId === undefined || pages === undefined) return undefined;
    return priceBookForLibrary(bookId, pages, pagePrice, extraFees);
  }

  /** A library reads its own profile (works even while the subscription is inactive). */
  getOwn(actor: LibraryAuthContext): Promise<LibraryPublicView> {
    return this.getByIdForOwner(actor.profileId);
  }

  /** A library updates its OWN profile; the target id is the token's profileId, never input. */
  async updateOwn(actor: LibraryAuthContext, dto: UpdateLibraryDto): Promise<LibraryPublicView> {
    const library = await this.repository.findById(actor.profileId);
    if (!library) {
      throw new NotFoundError('Library');
    }
    libraryPolicy.assertCanUpdate(actor, library);

    const updated = await this.repository.update(actor.profileId, {
      title: dto.title,
      location: dto.location,
      latitude: dto.latitude,
      longitude: dto.longitude,
      pagePrice: dto.pagePrice,
      extraFees: dto.extraFees,
    });
    return presentLibrary(updated);
  }

  private async getByIdForOwner(libraryId: number): Promise<LibraryPublicView> {
    const library = await this.repository.findById(libraryId);
    if (!library) throw new NotFoundError('Library');
    return presentLibrary(library);
  }

  /**
   * Resolve a library the actor is allowed to view, else 404 (never 403), so ids
   * of hidden/other libraries cannot be probed.
   */
  private async resolveViewable(actor: AuthContext, libraryId: number): Promise<LibraryDetails> {
    const now = new Date();
    switch (actor.role) {
      case 'ADMIN': {
        const library = await this.repository.findById(libraryId);
        if (!library) throw new NotFoundError('Library');
        return library;
      }
      case 'LIBRARY': {
        // Own profile regardless of visibility; any other id behaves as if it does not exist.
        if (libraryId === actor.profileId) {
          const own = await this.repository.findById(libraryId);
          if (!own) throw new NotFoundError('Library');
          return own;
        }
        const visible = await this.repository.findVisibleById(libraryId, now);
        if (!visible) throw new NotFoundError('Library');
        return visible;
      }
      case 'USER': {
        const visible = await this.repository.findVisibleById(libraryId, now);
        if (!visible) throw new NotFoundError('Library');
        return visible;
      }
    }
  }
}
