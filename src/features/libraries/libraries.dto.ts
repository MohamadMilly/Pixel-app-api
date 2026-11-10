import { z } from 'zod';
import { paginationQuerySchema, sortBySchema } from '../../shared/pagination/cursor-pagination.js';
import { idParamsSchema } from '../../shared/validation/parse-input.js';
import {
  LAT_BOUNDS,
  LIBRARY_SORT_FIELDS,
  LNG_BOUNDS,
  type BoundingBox,
  type LibraryBookPrice,
  type LibraryDetails,
} from './libraries.entity.js';

/* ───────────────────────────── Input DTOs ───────────────────────────── */

export const libraryIdParams = idParamsSchema('libraryId');

const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const listLibrariesQuery = paginationQuerySchema.extend({
  sortBy: sortBySchema(LIBRARY_SORT_FIELDS, 'id'),
  title: z.string().trim().min(1).max(120).optional(),
  maxPagePrice: z.coerce.number().int().nonnegative().optional(),
  /** Full-text search over title + location (tsvector); ignores coordinates. */
  search: z.string().trim().min(1).max(200).optional(),
  /** When set, each library includes the price of printing this book there. */
  bookId: z.coerce.number().int().positive().optional(),
  /** Admin-only; ignored for other roles by the policy. */
  includeHidden: booleanQuery.optional(),
});
export type ListLibrariesQuery = z.infer<typeof listLibrariesQuery>;

const latitude = z.coerce.number().min(LAT_BOUNDS.min).max(LAT_BOUNDS.max);
const longitude = z.coerce.number().min(LNG_BOUNDS.min).max(LNG_BOUNDS.max);

export const mapQuery = z
  .object({
    minLat: latitude,
    maxLat: latitude,
    minLng: longitude,
    maxLng: longitude,
    bookId: z.coerce.number().int().positive().optional(),
  })
  .refine((q) => q.minLat <= q.maxLat, { message: 'minLat must be <= maxLat', path: ['minLat'] })
  .refine((q) => q.minLng <= q.maxLng, { message: 'minLng must be <= maxLng', path: ['minLng'] });
export type MapQuery = z.infer<typeof mapQuery>;

const libraryFields = {
  title: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(255),
  latitude,
  longitude,
  pagePrice: z.coerce.number().int().nonnegative(),
  extraFees: z.coerce.number().int().nonnegative(),
};

export const updateLibraryDto = z
  .strictObject(libraryFields)
  .partial()
  .refine((dto) => Object.values(dto).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });
export type UpdateLibraryDto = z.infer<typeof updateLibraryDto>;

/* ──────────────────────────── Output presenters ──────────────────────────── */

export interface LibraryPublicView {
  readonly id: number;
  readonly title: string;
  readonly location: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly pagePrice: number;
  readonly extraFees: number;
  /** Present only when the request passed ?bookId= — price of that book at this library. */
  readonly price?: LibraryBookPrice;
}

/** Marker shape for the map — intentionally minimal to keep payloads small. */
export interface LibraryMapMarker {
  readonly id: number;
  readonly title: string;
  readonly latitude: number;
  readonly longitude: number;
  /** Present only when the request passed ?bookId=. */
  readonly price?: LibraryBookPrice;
}

export interface LibraryMapResponse {
  readonly markers: LibraryMapMarker[];
  readonly count: number;
  /** True when the result was capped at MAP_MAX_RESULTS (more libraries exist in the box). */
  readonly truncated: boolean;
  /** True when the requested box was larger than the allowed span and was shrunk. */
  readonly boundingBoxClamped: boolean;
  /** The box actually queried (after clamping), so the client can sync its viewport. */
  readonly effectiveBoundingBox: BoundingBox;
}

export function presentLibrary(library: LibraryDetails, price?: LibraryBookPrice): LibraryPublicView {
  return {
    id: library.id,
    title: library.title,
    location: library.location,
    latitude: library.latitude,
    longitude: library.longitude,
    pagePrice: library.pagePrice,
    extraFees: library.extraFees,
    ...(price ? { price } : {}),
  };
}

export function presentMapMarker(
  library: Pick<LibraryDetails, 'id' | 'title' | 'latitude' | 'longitude'>,
  price?: LibraryBookPrice,
): LibraryMapMarker {
  return {
    id: library.id,
    title: library.title,
    latitude: library.latitude,
    longitude: library.longitude,
    ...(price ? { price } : {}),
  };
}
