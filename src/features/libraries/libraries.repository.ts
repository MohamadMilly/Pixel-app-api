import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { visibleLibraryWhere } from '../../shared/domain/subscription.rules.js';
import { idCursorArgs, orderByWithTiebreaker } from '../../shared/pagination/cursor-pagination.js';
import type { SortOrder } from '../../types/api.types.js';
import {
  libraryDetailsArgs,
  type LibraryDetails,
  type LibraryListFilter,
  type LibrarySortField,
  type LibraryUpdateData,
  type MapQueryArgs,
} from './libraries.entity.js';

export interface LibraryListArgs {
  readonly filter: LibraryListFilter;
  readonly cursor: number | undefined;
  readonly limit: number;
  readonly sortBy: LibrarySortField;
  readonly sortOrder: SortOrder;
}

export type MapMarkerRow = Pick<
  LibraryDetails,
  'id' | 'title' | 'latitude' | 'longitude' | 'pagePrice' | 'extraFees'
>;

export interface LibrarySearchArgs {
  readonly term: string;
  readonly limit: number;
  readonly offset: number;
  readonly now: Date;
}

export interface LibrariesRepository {
  list(args: LibraryListArgs): Promise<LibraryDetails[]>;
  /** Visible-only full-text search over title + location (tsvector), ranked. */
  searchVisible(args: LibrarySearchArgs): Promise<LibraryDetails[]>;
  /** Markers inside the (already-clamped) box; capped at `limit`. Visible libraries only. */
  findInBoundingBox(args: MapQueryArgs): Promise<MapMarkerRow[]>;
  findById(id: number): Promise<LibraryDetails | null>;
  /** Returns the library only if it is currently visible to end users (active sub + account). */
  findVisibleById(id: number, now: Date): Promise<LibraryDetails | null>;
  update(id: number, data: LibraryUpdateData): Promise<LibraryDetails>;
  /** Page count of a book (to price it at each library), or null if the book is unknown. */
  findBookPages(bookId: number): Promise<number | null>;
}

export class PrismaLibrariesRepository implements LibrariesRepository {
  constructor(private readonly db: PrismaClient) {}

  list(args: LibraryListArgs): Promise<LibraryDetails[]> {
    return this.db.library.findMany({
      where: buildListWhere(args.filter),
      orderBy: orderByWithTiebreaker(args.sortBy, args.sortOrder),
      ...idCursorArgs(args.cursor, args.limit),
      ...libraryDetailsArgs,
    });
  }

  async searchVisible(args: LibrarySearchArgs): Promise<LibraryDetails[]> {
    // Parameterized: term/now/limit/offset are bound, never string-interpolated.
    // Visibility (ACTIVE account + active subscription) is enforced inside the query.
    const ranked = await this.db.$queryRaw<Array<{ id: number }>>`
      SELECT l."id"
      FROM "Library" l
      JOIN "UserAccount" a ON a."id" = l."accountId"
      WHERE a."status" = 'ACTIVE'
        AND l."searchVector" @@ websearch_to_tsquery('simple', ${args.term})
        AND EXISTS (
          SELECT 1 FROM "Subscription" s
          WHERE s."libraryId" = l."id"
            AND s."activatedAt" IS NOT NULL AND s."activatedAt" <= ${args.now}
            AND s."expiresAt" > ${args.now}
        )
      ORDER BY ts_rank(l."searchVector", websearch_to_tsquery('simple', ${args.term})) DESC, l."id" ASC
      LIMIT ${args.limit} OFFSET ${args.offset}`;

    const ids = ranked.map((r) => r.id);
    if (ids.length === 0) return [];
    const libraries = await this.db.library.findMany({ where: { id: { in: ids } }, ...libraryDetailsArgs });
    const byId = new Map(libraries.map((l) => [l.id, l]));
    return ids.map((id) => byId.get(id)).filter((l): l is LibraryDetails => l !== undefined);
  }

  findInBoundingBox(args: MapQueryArgs): Promise<MapMarkerRow[]> {
    const { box } = args;
    return this.db.library.findMany({
      where: {
        ...visibleLibraryWhere(args.now),
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
      // Hard cap: never materialise more than `limit` rows regardless of how many match.
      take: args.limit,
      orderBy: { id: 'asc' },
      select: { id: true, title: true, latitude: true, longitude: true, pagePrice: true, extraFees: true },
    });
  }

  async findBookPages(bookId: number): Promise<number | null> {
    const book = await this.db.book.findUnique({ where: { id: bookId }, select: { pages: true } });
    return book?.pages ?? null;
  }

  findById(id: number): Promise<LibraryDetails | null> {
    return this.db.library.findUnique({ where: { id }, ...libraryDetailsArgs });
  }

  findVisibleById(id: number, now: Date): Promise<LibraryDetails | null> {
    return this.db.library.findFirst({ where: { id, ...visibleLibraryWhere(now) }, ...libraryDetailsArgs });
  }

  update(id: number, data: LibraryUpdateData): Promise<LibraryDetails> {
    return this.db.library.update({
      where: { id },
      data: {
        ...(data.title === undefined ? {} : { title: data.title }),
        ...(data.location === undefined ? {} : { location: data.location }),
        ...(data.latitude === undefined ? {} : { latitude: data.latitude }),
        ...(data.longitude === undefined ? {} : { longitude: data.longitude }),
        ...(data.pagePrice === undefined ? {} : { pagePrice: data.pagePrice }),
        ...(data.extraFees === undefined ? {} : { extraFees: data.extraFees }),
      },
      ...libraryDetailsArgs,
    });
  }
}

function buildListWhere(filter: LibraryListFilter): Prisma.LibraryWhereInput {
  const base: Prisma.LibraryWhereInput = filter.includeHidden ? {} : visibleLibraryWhere(filter.now);
  return {
    ...base,
    ...(filter.title ? { title: { contains: filter.title, mode: 'insensitive' } } : {}),
    ...(filter.maxPagePrice === undefined ? {} : { pagePrice: { lte: filter.maxPagePrice } }),
  };
}
