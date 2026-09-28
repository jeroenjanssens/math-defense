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
  const moved = points.map((p) => ({ x: p.x + x, y: p.y + y }));
  g.fillPoints(moved as Phaser.Math.Vector2[], true);
  if (stroke !== undefined) g.strokePoints(moved as Phaser.Math.Vector2[], true, true);
};
