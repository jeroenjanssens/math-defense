import Phaser from 'phaser';
import { ENEMIES, type EnemySpec, type EnemyType } from '../config/balance';
import type { Path } from '../game/Path';
import { drawShape } from '../ui/shapes';
import { COLORS, shade } from '../ui/theme';

let nextId = 1;

/** A geometric monster with googly eyes that walks along the path. */
export class Enemy extends Phaser.GameObjects.Container {
  readonly id = nextId++;
  readonly kind: EnemyType;
  readonly spec: EnemySpec;
  readonly maxHp: number;
  hp: number;
  /** Distance travelled along the path in pixels. */
  distance: number;
  alive = true;
  private readonly baseSpeed: number;
  private slowFactor = 1;
  private slowUntil = 0;
  private readonly shape: Phaser.GameObjects.Graphics;
  private readonly eyes: Phaser.GameObjects.Graphics;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly frost: Phaser.GameObjects.Graphics;
  private wobble = Math.random() * Math.PI * 2;
  private heading = 0;

  constructor(
    scene: Phaser.Scene,
    kind: EnemyType,
    readonly hpMultiplier: number,
    readonly speedMultiplier: number,
    distance = 0,
  ) {
    super(scene, 0, 0);
    this.kind = kind;
    this.spec = ENEMIES[kind];
    this.maxHp = Math.max(1, Math.round(this.spec.hp * hpMultiplier));
    this.hp = this.maxHp;
    this.baseSpeed = this.spec.speed * speedMultiplier;
    this.distance = distance;

    this.shape = scene.add.graphics();
    this.frost = scene.add.graphics();
    this.eyes = scene.add.graphics();
    this.hpBar = scene.add.graphics();
    this.add([this.shape, this.frost, this.eyes, this.hpBar]);
    this.drawBody();
    this.drawEyes();
    this.drawHp();
    scene.add.existing(this);
  }

  get radius(): number {
    return this.spec.radius;
  }

  get isSlowed(): boolean {
    return this.slowFactor < 1;
  }

  private drawBody(): void {
    const { shape, color, radius } = this.spec;
    this.shape.clear();
    this.shape.fillStyle(0x000000, 0.3);
    this.shape.fillEllipse(0, radius * 0.95, radius * 1.8, radius * 0.5);
    drawShape(this.shape, shape, 0, 0, radius, color, shade(color, -0.4), 3);
    this.shape.fillStyle(0xffffff, 0.25);
    this.shape.fillCircle(-radius * 0.35, -radius * 0.4, radius * 0.22);
  }

  private drawEyes(): void {
    const r = this.spec.radius;
    const eyeR = Math.max(4, r * 0.3);
    const spread = r * 0.38;
    const look = { x: Math.cos(this.heading) * eyeR * 0.4, y: Math.sin(this.heading) * eyeR * 0.4 };
    const g = this.eyes;
    g.clear();
    for (const side of [-1, 1]) {
      const ex = side * spread;
      const ey = -r * 0.08;
      g.fillStyle(0xffffff, 1);
      g.fillCircle(ex, ey, eyeR);
      g.fillStyle(0x111111, 1);
      g.fillCircle(ex + look.x, ey + look.y, eyeR * 0.5);
    }
    if (this.kind === 'boss') {
      // Angry eyebrows for the boss
      g.lineStyle(4, 0x111111, 1);
      g.beginPath();
      g.moveTo(-spread - eyeR, -r * 0.45);
      g.lineTo(-spread + eyeR, -r * 0.3);
      g.moveTo(spread + eyeR, -r * 0.45);
      g.lineTo(spread - eyeR, -r * 0.3);
      g.strokePath();
    }
  }

  private drawHp(): void {
    const g = this.hpBar;
    g.clear();
    if (this.hp >= this.maxHp) return;
    const w = Math.max(30, this.spec.radius * 2);
    const y = -this.spec.radius - 12;
    g.fillStyle(0x000000, 0.6);
    g.fillRoundedRect(-w / 2 - 2, y - 2, w + 4, 8, 3);
    const f = Math.max(0, this.hp / this.maxHp);
    g.fillStyle(f > 0.5 ? COLORS.green : f > 0.25 ? COLORS.yellow : COLORS.red, 1);
    g.fillRoundedRect(-w / 2, y, Math.max(2, w * f), 4, 2);
  }

  slow(factor: number, durationMs: number, now: number): void {
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowUntil = Math.max(this.slowUntil, now + durationMs);
    this.frost.clear();
    this.frost.lineStyle(3, COLORS.cyan, 0.9);
    this.frost.strokeCircle(0, 0, this.spec.radius + 5);
  }

  /** Apply damage; returns true when this hit killed the enemy. */
  hit(damage: number): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    this.drawHp();
    this.shape.setAlpha(0.5);
    this.scene.time.delayedCall(60, () => this.shape?.setAlpha(1));
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  /** Move along the path; returns true when the enemy reached the end. */
  step(deltaMs: number, now: number, path: Path, speedScale: number): boolean {
    if (this.slowFactor < 1 && now >= this.slowUntil) {
      this.slowFactor = 1;
      this.frost.clear();
    }
    this.distance += (this.baseSpeed * this.slowFactor * speedScale * deltaMs) / 1000;
    const pos = path.at(this.distance);
    this.wobble += deltaMs * 0.012 * this.slowFactor;
    this.setPosition(pos.x, pos.y + Math.sin(this.wobble) * 2);
    this.shape.setScale(1 + Math.sin(this.wobble) * 0.04, 1 - Math.sin(this.wobble) * 0.04);
    if (Math.abs(pos.angle - this.heading) > 0.01) {
      this.heading = pos.angle;
      this.drawEyes();
    }
    return this.distance >= path.length;
  }
}
