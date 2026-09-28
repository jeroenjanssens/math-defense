import Phaser from 'phaser';
import { playSfx } from '../audio/sfx';
import { BASE_DAMAGE, ENEMIES, type EnemyType, type TowerType } from '../config/balance';
import {
  BASE_CELL,
  BUILD_SPOTS,
  CELL,
  cellCenter,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAP_X,
  MAP_Y,
  PATH_CELLS,
} from '../config/map';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { COLORS, shade, textStyle } from '../ui/theme';
import { Path } from './Path';

interface Projectile {
  obj: Phaser.GameObjects.Arc;
  target: Enemy;
  lastX: number;
  lastY: number;
  speed: number;
  damage: number;
  splash?: number;
  slow?: { factor: number; ms: number };
  color: number;
  power: boolean;
}

export interface WorldEvents {
  onKill: (enemy: Enemy) => void;
  onLeak: (enemy: Enemy) => void;
  onSpotClicked: (spot: number) => void;
  onTowerClicked: (tower: Tower) => void;
}

/** The playing field: map, enemies, towers, projectiles and effects. */
export class World {
  readonly path: Path;
  readonly enemies: Enemy[] = [];
  readonly towers: (Tower | null)[] = BUILD_SPOTS.map(() => null);
  private projectiles: Projectile[] = [];
  private readonly spotGfx: Phaser.GameObjects.Graphics[] = [];
  private readonly baseContainer: Phaser.GameObjects.Container;
  private readonly baseCannon: Phaser.GameObjects.Graphics;
  private readonly emitters = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>();
  /** Multiplies enemy speed (used by the tutorial and when paused for a tutorial step). */
  speedScale = 1;
  private spotsEnabled = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly events: WorldEvents,
  ) {
    const points = PATH_CELLS.map(cellCenter);
    this.path = new Path(points);
    this.drawMap();
    this.createSpots();
    const base = cellCenter(BASE_CELL);
    this.baseContainer = scene.add.container(base.x, base.y).setDepth(5);
    this.baseCannon = scene.add.graphics();
    this.drawBase();
  }

  // ---------------------------------------------------------------- drawing

  private drawMap(): void {
    const g = this.scene.add.graphics().setDepth(0);
    g.fillStyle(COLORS.grass, 1);
    g.fillRect(MAP_X, MAP_Y, MAP_WIDTH, MAP_HEIGHT);
    // Soft checkerboard
    for (let c = 0; c < MAP_WIDTH / CELL; c++) {
      for (let r = 0; r < MAP_HEIGHT / CELL; r++) {
        if ((c + r) % 2 === 0) {
          g.fillStyle(0xffffff, 0.018);
          g.fillRect(MAP_X + c * CELL, MAP_Y + r * CELL, CELL, CELL);
        }
      }
    }
    // Decorative dots (stars)
    const rng = new Phaser.Math.RandomDataGenerator(['math-defense']);
    for (let i = 0; i < 70; i++) {
      g.fillStyle(0xffffff, rng.realInRange(0.05, 0.25));
      g.fillCircle(MAP_X + rng.between(0, MAP_WIDTH), MAP_Y + rng.between(0, MAP_HEIGHT), rng.realInRange(1, 2.2));
    }

    const pts = this.path.points;
    const drawLine = (width: number, color: number, alpha = 1) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      g.strokePath();
      g.fillStyle(color, alpha);
      for (const p of pts.slice(1, -1)) g.fillCircle(p.x, p.y, width / 2);
    };
    drawLine(CELL * 0.92, COLORS.pathEdge);
    drawLine(CELL * 0.78, COLORS.path);
    // Dashed centre line
    g.fillStyle(COLORS.pathEdge, 0.8);
    for (let d = 20; d < this.path.length - 20; d += 28) {
      const p = this.path.at(d);
      g.fillCircle(p.x, p.y, 3);
    }
    // Spawn portal
    const start = cellCenter({ col: 0, row: PATH_CELLS[0].row });
    const portal = this.scene.add.graphics({ x: start.x - CELL / 2 + 6, y: start.y }).setDepth(1);
    portal.fillStyle(COLORS.purple, 0.35);
    portal.fillEllipse(0, 0, 22, CELL * 0.95);
    portal.fillStyle(COLORS.purple, 0.8);
    portal.fillEllipse(0, 0, 10, CELL * 0.75);
    this.scene.tweens.add({ targets: portal, scaleY: 0.85, duration: 700, yoyo: true, repeat: -1 });
  }

  private createSpots(): void {
    BUILD_SPOTS.forEach((cell, i) => {
      const { x, y } = cellCenter(cell);
      const g = this.scene.add.graphics({ x, y }).setDepth(2);
      g.fillStyle(0xffffff, 0.06);
      g.fillRoundedRect(-24, -24, 48, 48, 12);
      g.lineStyle(3, 0xffffff, 0.35);
      g.strokeRoundedRect(-24, -24, 48, 48, 12);
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(-9, -2, 18, 4);
      g.fillRect(-2, -9, 4, 18);
      g.setInteractive(new Phaser.Geom.Rectangle(-28, -28, 56, 56), Phaser.Geom.Rectangle.Contains);
      if (g.input) g.input.cursor = 'pointer';
      g.on('pointerup', () => {
        if (!this.spotsEnabled) return;
        const tower = this.towers[i];
        if (tower) this.events.onTowerClicked(tower);
        else this.events.onSpotClicked(i);
      });
      this.spotGfx.push(g);
    });
  }

  setSpotsEnabled(enabled: boolean): void {
    this.spotsEnabled = enabled;
  }

  spotPosition(spot: number): { x: number; y: number } {
    return cellCenter(BUILD_SPOTS[spot]);
  }

  private drawBase(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(3, 6, 30);
    g.fillStyle(shade(COLORS.primary, -0.3), 1);
    g.fillCircle(0, 0, 30);
    g.fillStyle(COLORS.primary, 1);
    g.fillCircle(0, 0, 25);
    g.lineStyle(3, 0xffffff, 0.6);
    g.strokeCircle(0, 0, 25);
    const c = this.baseCannon;
    c.fillStyle(0xffffff, 1);
    c.fillRoundedRect(0, -5, 26, 10, 4);
    c.fillStyle(COLORS.yellow, 1);
    c.fillCircle(0, 0, 11);
    this.baseCannon.rotation = Math.PI;
    this.baseContainer.add([g, c]);
    this.scene.tweens.add({ targets: g, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  hitBase(): void {
    this.scene.cameras.main.shake(180, 0.006);
    this.scene.tweens.add({ targets: this.baseContainer, scale: { from: 0.8, to: 1 }, duration: 250 });
    this.burst(this.baseContainer.x, this.baseContainer.y, COLORS.red, 16);
  }

  get basePosition(): { x: number; y: number } {
    return { x: this.baseContainer.x, y: this.baseContainer.y };
  }

  // ---------------------------------------------------------------- enemies

  spawn(kind: EnemyType, hpMultiplier: number, speedMultiplier: number, distance = 0): Enemy {
    const enemy = new Enemy(this.scene, kind, hpMultiplier, speedMultiplier, distance);
    enemy.setDepth(10);
    enemy.step(0, this.scene.time.now, this.path, 0);
    enemy.setScale(0);
    this.scene.tweens.add({ targets: enemy, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.enemies.push(enemy);
    return enemy;
  }

  private kill(enemy: Enemy): void {
    this.burst(enemy.x, enemy.y, enemy.spec.color, enemy.kind === 'boss' ? 40 : 14);
    if (enemy.kind === 'boss') this.scene.cameras.main.shake(300, 0.012);
    playSfx('enemyDie');
    const split = enemy.spec.splitInto;
    if (split) {
      for (let i = 0; i < split.count; i++) {
        const mini = this.spawn(
          split.type,
          enemy.hpMultiplier,
          enemy.speedMultiplier,
          Math.max(0, enemy.distance - i * 22),
        );
        mini.setScale(0.6);
      }
    }
    this.events.onKill(enemy);
    this.removeEnemy(enemy);
  }

  private removeEnemy(enemy: Enemy): void {
    enemy.alive = false;
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) this.enemies.splice(index, 1);
    enemy.destroy();
  }

  clearEnemies(): void {
    [...this.enemies].forEach((e) => this.removeEnemy(e));
    this.projectiles.forEach((p) => p.obj.destroy());
    this.projectiles = [];
  }

  /** Enemies sorted from closest-to-base to furthest. */
  private enemiesByProgress(): Enemy[] {
    return this.enemies.filter((e) => e.alive).sort((a, b) => b.distance - a.distance);
  }

  // ---------------------------------------------------------------- towers

  build(spot: number, kind: TowerType): Tower {
    const { x, y } = this.spotPosition(spot);
    const tower = new Tower(this.scene, x, y, kind, spot).setDepth(6);
    this.towers[spot] = tower;
    this.spotGfx[spot].setAlpha(0.001);
    this.burst(x, y, tower.spec.color, 12);
    return tower;
  }

  sell(tower: Tower): void {
    this.towers[tower.spot] = null;
    this.spotGfx[tower.spot].setAlpha(1);
    this.burst(tower.x, tower.y, COLORS.yellow, 10);
    tower.destroy();
  }

  get towerList(): Tower[] {
    return this.towers.filter((t): t is Tower => t !== null);
  }

  /**
   * Every tower fires at the enemy nearest to the base within its range, and the base cannon
   * fires at the front enemy. Returns false when there was nothing to shoot at.
   */
  volley(multiplier: number): boolean {
    const targets = this.enemiesByProgress();
    if (targets.length === 0) return false;
    const power = multiplier > 1;

    for (const tower of this.towerList) {
      const stats = tower.stats;
      const target = targets.find((e) => Phaser.Math.Distance.Between(tower.x, tower.y, e.x, e.y) <= stats.range);
      if (!target) continue;
      tower.aimAt(target.x, target.y);
      if (tower.kind === 'freezer') {
        this.freezePulse(tower, multiplier);
        continue;
      }
      const perShot = (stats.damage * multiplier) / stats.shots;
      for (let i = 0; i < stats.shots; i++) {
        this.scene.time.delayedCall(i * 90, () => {
          if (!tower.active) return;
          tower.recoil();
          const aim = target.alive ? target : targets.find((e) => e.alive);
          if (!aim) return;
          this.fireProjectile(tower.x, tower.y, aim, {
            damage: perShot,
            speed: tower.kind === 'splash' ? 420 : 700,
            splash: stats.radius,
            color: tower.spec.color,
            size: tower.kind === 'splash' ? 9 : 6,
            power,
          });
        });
      }
      playSfx('shoot');
    }

    // Base cannon: always has range, so every correct answer does something.
    const front = targets[0];
    const base = this.basePosition;
    this.baseCannon.rotation = Math.atan2(front.y - base.y, front.x - base.x);
    this.fireProjectile(base.x, base.y, front, {
      damage: BASE_DAMAGE * multiplier,
      speed: 800,
      color: COLORS.yellow,
      size: 6,
      power,
    });
    return true;
  }

  private freezePulse(tower: Tower, multiplier: number): void {
    const stats = tower.stats;
    const ring = this.scene.add.circle(tower.x, tower.y, 10).setStrokeStyle(4, COLORS.cyan, 1).setDepth(9);
    this.scene.tweens.add({
      targets: ring,
      radius: stats.range,
      alpha: 0,
      duration: 450,
      onComplete: () => ring.destroy(),
    });
    playSfx('freeze');
    const now = this.scene.time.now;
    for (const enemy of this.enemiesByProgress()) {
      if (Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y) > stats.range) continue;
      enemy.slow(stats.slow ?? 0.5, stats.slowMs ?? 3000, now);
      if (enemy.hit(stats.damage * multiplier)) this.kill(enemy);
    }
  }

  private fireProjectile(
    x: number,
    y: number,
    target: Enemy,
    opts: { damage: number; speed: number; color: number; size: number; splash?: number; power: boolean },
  ): void {
    const size = opts.power ? opts.size * 1.6 : opts.size;
    const obj = this.scene.add.circle(x, y, size, opts.power ? 0xffffff : opts.color).setDepth(12);
    obj.setStrokeStyle(3, opts.color, 1);
    this.projectiles.push({
      obj,
      target,
      lastX: target.x,
      lastY: target.y,
      speed: opts.speed,
      damage: opts.damage,
      splash: opts.splash,
      color: opts.color,
      power: opts.power,
    });
  }

  // ---------------------------------------------------------------- update

  update(deltaMs: number): void {
    const now = this.scene.time.now;
    for (const enemy of [...this.enemies]) {
      if (!enemy.alive) continue;
      if (enemy.step(deltaMs, now, this.path, this.speedScale)) {
        this.events.onLeak(enemy);
        this.removeEnemy(enemy);
      }
    }

    for (const p of [...this.projectiles]) {
      if (p.target.alive) {
        p.lastX = p.target.x;
        p.lastY = p.target.y;
      }
      const dx = p.lastX - p.obj.x;
      const dy = p.lastY - p.obj.y;
      const dist = Math.hypot(dx, dy);
      const stepLen = (p.speed * deltaMs) / 1000;
      if (dist <= stepLen + 4) {
        this.impact(p);
        continue;
      }
      p.obj.x += (dx / dist) * stepLen;
      p.obj.y += (dy / dist) * stepLen;
    }
  }

  private impact(p: Projectile): void {
    this.projectiles.splice(this.projectiles.indexOf(p), 1);
    p.obj.destroy();
    if (p.splash) {
      const boom = this.scene.add.circle(p.lastX, p.lastY, p.splash, p.color, 0.35).setDepth(11);
      this.scene.tweens.add({ targets: boom, alpha: 0, scale: 1.2, duration: 300, onComplete: () => boom.destroy() });
      playSfx('explode');
      for (const enemy of [...this.enemies]) {
        if (!enemy.alive) continue;
        if (Phaser.Math.Distance.Between(p.lastX, p.lastY, enemy.x, enemy.y) <= p.splash + enemy.radius) {
          if (enemy.hit(p.damage)) this.kill(enemy);
        }
      }
      return;
    }
    this.burst(p.lastX, p.lastY, p.color, p.power ? 10 : 4);
    if (p.target.alive && p.target.hit(p.damage)) this.kill(p.target);
  }

  // ---------------------------------------------------------------- effects

  burst(x: number, y: number, color: number, count: number): void {
    let emitter = this.emitters.get(color);
    if (!emitter) {
      emitter = this.scene.add.particles(0, 0, 'dot', {
        speed: { min: 60, max: 240 },
        lifespan: { min: 300, max: 700 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: color,
        emitting: false,
      });
      emitter.setDepth(20);
      this.emitters.set(color, emitter);
    }
    emitter.explode(count, x, y);
  }

  floatText(x: number, y: number, text: string, color: number, size = 24): void {
    const label = this.scene.add
      .text(x, y, text, textStyle(size, color, '700', { stroke: '#0b1026', strokeThickness: 5 }))
      .setOrigin(0.5)
      .setDepth(30);
    this.scene.tweens.add({
      targets: label,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  /** Enemies that exist right now (for wave completion). */
  get enemyCount(): number {
    return this.enemies.length;
  }

  /** How far the front-most enemy is, as a fraction of the path. */
  get dangerLevel(): number {
    const front = this.enemiesByProgress()[0];
    return front ? front.distance / this.path.length : 0;
  }

  static enemyReward(kind: EnemyType): number {
    return ENEMIES[kind].reward;
  }
}
