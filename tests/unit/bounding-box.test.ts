import { describe, expect, it } from '@jest/globals';
import { clampBoundingBox } from '../../src/features/libraries/libraries.entity.js';

describe('clampBoundingBox', () => {
  it('leaves a box within the max span untouched', () => {
    const req = { minLat: 33.4, maxLat: 33.6, minLng: 36.2, maxLng: 36.4 };
    const { box, clamped } = clampBoundingBox(req, 1, 1);
    expect(clamped).toBe(false);
    expect(box).toEqual(req);
  });

  it('clamps an oversized latitude span to the max, keeping the centre', () => {
    // span = 10, max = 1, centre = 35
    const { box, clamped } = clampBoundingBox({ minLat: 30, maxLat: 40, minLng: 36.2, maxLng: 36.4 }, 1, 1);
    expect(clamped).toBe(true);
    expect(box.maxLat - box.minLat).toBeCloseTo(1);
    expect((box.minLat + box.maxLat) / 2).toBeCloseTo(35);
  });

  it('clamps an oversized longitude span as well', () => {
    const { box, clamped } = clampBoundingBox({ minLat: 33.4, maxLat: 33.6, minLng: 0, maxLng: 50 }, 1, 1);
    expect(clamped).toBe(true);
    expect(box.maxLng - box.minLng).toBeCloseTo(1);
  });

  it('keeps a clamped box within world bounds near a pole', () => {
    const { box } = clampBoundingBox({ minLat: 89.9, maxLat: 100, minLng: 0, maxLng: 0.1 }, 1, 1);
    expect(box.maxLat).toBeLessThanOrEqual(90);
    expect(box.minLat).toBeGreaterThanOrEqual(-90);
    expect(box.maxLat - box.minLat).toBeCloseTo(1);
  });
});
