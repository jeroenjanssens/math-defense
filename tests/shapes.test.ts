import { describe, expect, it } from 'vitest';
import { filletPoints, polygonPoints } from '../src/ui/shapes';

describe('filletPoints', () => {
  it('rounds every corner of a square', () => {
    const square = polygonPoints(4, Math.SQRT2 * 10, -Math.PI / 4); // corners at (±10, ±10)
    const rounded = filletPoints(square, 3, 4);
    expect(rounded).toHaveLength(4 * 5);
    for (const p of rounded) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(10 + 1e-9);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(10 + 1e-9);
    }
    // The sharp corner is cut off: the middle of the arc is 3·(√2 − 1) away from it.
    const nearest = Math.min(...rounded.map((p) => Math.hypot(p.x - 10, p.y - 10)));
    expect(nearest).toBeCloseTo(3 * (Math.SQRT2 - 1), 5);
  });

  it('never cuts more than half an edge', () => {
    const tri = polygonPoints(3, 5);
    const rounded = filletPoints(tri, 100, 2);
    expect(rounded.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
});
