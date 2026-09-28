export interface PathPoint {
  x: number;
  y: number;
}

/** A polyline that enemies follow, with lookup by travelled distance. */
export class Path {
  readonly points: PathPoint[];
  private readonly cumulative: number[];
  readonly length: number;

  constructor(points: PathPoint[]) {
    this.points = points;
    this.cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      this.cumulative.push(this.cumulative[i - 1] + Math.hypot(dx, dy));
    }
    this.length = this.cumulative[this.cumulative.length - 1];
  }

  /** Position and heading (radians) at the given distance along the path. */
  at(distance: number): { x: number; y: number; angle: number } {
    const d = Math.max(0, Math.min(this.length, distance));
    let i = 1;
    while (i < this.cumulative.length - 1 && this.cumulative[i] < d) i++;
    const a = this.points[i - 1];
    const b = this.points[i];
    const segment = this.cumulative[i] - this.cumulative[i - 1] || 1;
    const f = (d - this.cumulative[i - 1]) / segment;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, angle: Math.atan2(b.y - a.y, b.x - a.x) };
  }
}
