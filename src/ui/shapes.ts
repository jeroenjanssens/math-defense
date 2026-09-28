import type Phaser from 'phaser';

export type ShapeKind = 'circle' | 'triangle' | 'square' | 'diamond' | 'pentagon' | 'hexagon' | 'star';

/** Points of a regular polygon centred on (0, 0), with the first point at the top. */
export const polygonPoints = (sides: number, radius: number, rotation = -Math.PI / 2): Phaser.Types.Math.Vector2Like[] =>
  Array.from({ length: sides }, (_, i) => {
    const angle = rotation + (i * Math.PI * 2) / sides;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

export const starPoints = (points: number, outer: number, inner: number): Phaser.Types.Math.Vector2Like[] =>
  Array.from({ length: points * 2 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 === 0 ? outer : inner;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });

type Point = Phaser.Types.Math.Vector2Like;

/**
 * Replace every corner of a closed polygon with a circular fillet of the given radius (smaller where
 * the edges are too short). Works for both convex and concave corners.
 */
export const filletPoints = (points: Point[], radius: number, segments = 6): Point[] => {
  const out: Point[] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[(i + n - 1) % n];
    const b = points[(i + 1) % n];
    const la = Math.hypot(a.x - p.x, a.y - p.y);
    const lb = Math.hypot(b.x - p.x, b.y - p.y);
    const u1 = { x: (a.x - p.x) / la, y: (a.y - p.y) / la };
    const u2 = { x: (b.x - p.x) / lb, y: (b.y - p.y) / lb };
    const angle = Math.acos(Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y)));
    if (angle < 1e-3 || Math.PI - angle < 1e-3) {
      out.push(p);
      continue;
    }
    // Distance from the corner to where the fillet touches the edges.
    const tan = Math.tan(angle / 2);
    const cut = Math.min(radius / tan, la / 2, lb / 2);
    const r = cut * tan;
    const bis = { x: u1.x + u2.x, y: u1.y + u2.y };
    const bl = Math.hypot(bis.x, bis.y);
    const d = r / Math.sin(angle / 2);
    const c = { x: p.x + (bis.x / bl) * d, y: p.y + (bis.y / bl) * d };
    const a0 = Math.atan2(p.y + u1.y * cut - c.y, p.x + u1.x * cut - c.x);
    const a1 = Math.atan2(p.y + u2.y * cut - c.y, p.x + u2.x * cut - c.x);
    let sweep = a1 - a0;
    if (sweep > Math.PI) sweep -= Math.PI * 2;
    if (sweep < -Math.PI) sweep += Math.PI * 2;
    for (let s = 0; s <= segments; s++) {
      const t = a0 + (sweep * s) / segments;
      out.push({ x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r });
    }
  }
  return out;
};

/** Fillet radius as a fraction of the shape's radius. */
const FILLET = 0.28;

const shapePoints = (kind: ShapeKind, r: number): Phaser.Types.Math.Vector2Like[] | null => {
  switch (kind) {
    case 'circle':
      return null;
    case 'triangle':
      return polygonPoints(3, r * 1.15, -Math.PI / 2).map((p) => ({ x: p.x, y: p.y + r * 0.15 }));
    case 'square':
      return polygonPoints(4, r * 1.2, -Math.PI / 4);
    case 'diamond':
      return polygonPoints(4, r * 1.15);
    case 'pentagon':
      return polygonPoints(5, r * 1.08);
    case 'hexagon':
      return polygonPoints(6, r * 1.05, 0);
    case 'star':
      return starPoints(5, r * 1.2, r * 0.55);
  }
};

/** Draw a filled shape with an outline at (x, y). */
export const drawShape = (
  g: Phaser.GameObjects.Graphics,
  kind: ShapeKind,
  x: number,
  y: number,
  r: number,
  fill: number,
  stroke?: number,
  strokeWidth = 3,
): void => {
  const points = shapePoints(kind, r);
  g.fillStyle(fill, 1);
  if (stroke !== undefined) g.lineStyle(strokeWidth, stroke, 1);
  if (!points) {
    g.fillCircle(x, y, r);
    if (stroke !== undefined) g.strokeCircle(x, y, r);
    return;
  }
  const moved = filletPoints(points, r * FILLET).map((p) => ({ x: p.x + x, y: p.y + y }));
  g.fillPoints(moved as Phaser.Math.Vector2[], true);
  if (stroke !== undefined) g.strokePoints(moved as Phaser.Math.Vector2[], true, true);
};
