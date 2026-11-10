import type { Prisma } from '../../generated/prisma/client.js';

export const libraryDetailsArgs = {
  include: { account: { select: { status: true, createdAt: true } } },
} satisfies Prisma.LibraryDefaultArgs;

export type LibraryDetails = Prisma.LibraryGetPayload<typeof libraryDetailsArgs>;

export const LIBRARY_SORT_FIELDS = ['id', 'title', 'pagePrice', 'extraFees'] as const;
export type LibrarySortField = (typeof LIBRARY_SORT_FIELDS)[number];

/** Price of printing a given book at a library (flat per-library rate), with its inputs. */
export interface LibraryBookPrice {
  readonly bookId: number;
  readonly pageCount: number;
  readonly pagePrice: number;
  readonly extraFees: number;
  readonly total: number;
}

export function priceBookForLibrary(
  bookId: number,
  pages: number,
  pagePrice: number,
  extraFees: number,
): LibraryBookPrice {
  return { bookId, pageCount: pages, pagePrice, extraFees, total: pages * pagePrice + extraFees };
}

export interface LibraryListFilter {
  readonly title: string | undefined;
  readonly maxPagePrice: number | undefined;
  /**
   * Include libraries that are NOT currently visible (inactive subscription / non-active account).
   * Only ever true for admins — enforced by the policy, not the repository.
   */
  readonly includeHidden: boolean;
  readonly now: Date;
}

/** A geographic bounding box. Invariant: min <= max on both axes. */
export interface BoundingBox {
  readonly minLat: number;
  readonly minLng: number;
  readonly maxLat: number;
  readonly maxLng: number;
}

export interface MapQueryArgs {
  readonly box: BoundingBox;
  readonly limit: number;
  readonly now: Date;
}

export interface LibraryUpdateData {
  readonly title: string | undefined;
  readonly location: string | undefined;
  readonly latitude: number | undefined;
  readonly longitude: number | undefined;
  readonly pagePrice: number | undefined;
  readonly extraFees: number | undefined;
}

/* ───────────────────────── Geo helpers (pure) ───────────────────────── */

export const LAT_BOUNDS = { min: -90, max: 90 } as const;
export const LNG_BOUNDS = { min: -180, max: 180 } as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Clamp one axis of a bounding box to a maximum span while keeping its centre,
 * then clamp the whole interval inside the world bounds.
 */
function clampAxis(
  min: number,
  max: number,
  maxSpan: number,
  bounds: { min: number; max: number },
): { min: number; max: number } {
  const span = max - min;
  if (span <= maxSpan) {
    return { min, max };
  }
  const centre = (min + max) / 2;
  let lo = centre - maxSpan / 2;
  let hi = centre + maxSpan / 2;
  // Shift back inside world bounds if the centre was near an edge.
  if (lo < bounds.min) {
    lo = bounds.min;
    hi = bounds.min + maxSpan;
  } else if (hi > bounds.max) {
    hi = bounds.max;
    lo = bounds.max - maxSpan;
  }
  return { min: clamp(lo, bounds.min, bounds.max), max: clamp(hi, bounds.min, bounds.max) };
}

export interface ClampResult {
  readonly box: BoundingBox;
  readonly clamped: boolean;
}

/** If either span exceeds the maximum, shrink it to the max (the "default maximum box"). */
export function clampBoundingBox(
  requested: BoundingBox,
  maxLatSpan: number,
  maxLngSpan: number,
): ClampResult {
  const lat = clampAxis(requested.minLat, requested.maxLat, maxLatSpan, LAT_BOUNDS);
  const lng = clampAxis(requested.minLng, requested.maxLng, maxLngSpan, LNG_BOUNDS);
  const box: BoundingBox = { minLat: lat.min, maxLat: lat.max, minLng: lng.min, maxLng: lng.max };

  const clamped =
    requested.maxLat - requested.minLat > maxLatSpan || requested.maxLng - requested.minLng > maxLngSpan;

  return { box, clamped };
}
