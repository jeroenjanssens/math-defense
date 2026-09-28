import Phaser from 'phaser';
import { SELL_REFUND, TOWERS, type TowerLevel, type TowerSpec, type TowerType } from '../config/balance';
import { COLORS, shade } from '../ui/theme';

/** A tower on a build spot; its turret turns towards whatever it shoots at. */
export class Tower extends Phaser.GameObjects.Container {
  readonly kind: TowerType;
  readonly spec: TowerSpec;
  readonly spot: number;
  level = 1;
  spent: number;
  private readonly baseGfx: Phaser.GameObjects.Graphics;
  private readonly turret: Phaser.GameObjects.Graphics;
  private readonly pips: Phaser.GameObjects.Graphics;
  private readonly rangeGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: TowerType, spot: number) {
    super(scene, x, y);
    this.kind = kind;
    this.spec = TOWERS[kind];
    this.spot = spot;
    this.spent = this.spec.cost;
    this.rangeGfx = scene.add.graphics();
    this.baseGfx = scene.add.graphics();
    this.turret = scene.add.graphics();
    this.pips = scene.add.graphics();
    this.add([this.rangeGfx, this.baseGfx, this.turret, this.pips]);
    this.redraw();
    this.turret.rotation = -Math.PI / 2;
    scene.add.existing(this);
    this.setScale(0.2);
    scene.tweens.add({ targets: this, scale: 1, duration: 300, ease: 'Back.easeOut' });
  }

  get stats(): TowerLevel {
    return this.spec.levels[this.level - 1];
  }

  get canUpgrade(): boolean {
    return this.level < 3;
  }

  get upgradeCost(): number {
    return this.canUpgrade ? this.spec.upgrades[this.level - 1] : 0;
  }

  get sellValue(): number {
    return Math.floor(this.spent * SELL_REFUND);
  }

  upgrade(): void {
    if (!this.canUpgrade) return;
    this.spent += this.upgradeCost;
    this.level++;
    this.redraw();
    this.scene.tweens.add({ targets: this, scale: { from: 1.3, to: 1 }, duration: 250, ease: 'Back.easeOut' });
  }

  showRange(show: boolean): void {
    this.rangeGfx.clear();
    if (!show) return;
    this.rangeGfx.fillStyle(this.spec.color, 0.12);
    this.rangeGfx.fillCircle(0, 0, this.stats.range);
    this.rangeGfx.lineStyle(2, this.spec.color, 0.6);
    this.rangeGfx.strokeCircle(0, 0, this.stats.range);
  }

  aimAt(x: number, y: number): void {
    this.turret.rotation = Math.atan2(y - this.y, x - this.x);
  }

  /** Little recoil animation when firing. */
  recoil(): void {
    this.scene.tweens.add({ targets: this.turret, scale: { from: 0.85, to: 1 }, duration: 150 });
  }

  private redraw(): void {
    const color = this.spec.color;
    const b = this.baseGfx;
    b.clear();
    b.fillStyle(0x000000, 0.35);
    b.fillCircle(2, 5, 25);
    b.fillStyle(shade(COLORS.panelLight, -0.1), 1);
    b.fillRoundedRect(-24, -24, 48, 48, 12);
    b.lineStyle(3, shade(color, -0.3), 1);
    b.strokeRoundedRect(-24, -24, 48, 48, 12);

    const t = this.turret;
    t.clear();
    t.fillStyle(shade(color, -0.35), 1);
    switch (this.kind) {
      case 'blaster': {
        const barrels = this.level;
        const spacing = 7;
        for (let i = 0; i < barrels; i++) {
          const off = (i - (barrels - 1) / 2) * spacing;
          t.fillRoundedRect(4, off - 3.5, 22, 7, 3);
        }
        break;
      }
      case 'splash':
        t.fillRoundedRect(2, -8, 18 + this.level * 2, 16, 5);
        break;
      case 'freezer':
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3;
          t.fillCircle(Math.cos(a) * 15, Math.sin(a) * 15, 5 + this.level);
        }
        break;
    }
    t.fillStyle(color, 1);
    t.lineStyle(3, shade(color, -0.4), 1);
    if (this.kind === 'splash') {
      t.fillRoundedRect(-13, -13, 26, 26, 6);
      t.strokeRoundedRect(-13, -13, 26, 26, 6);
    } else {
      t.fillCircle(0, 0, 14);
      t.strokeCircle(0, 0, 14);
    }
    t.fillStyle(0xffffff, 0.35);
    t.fillCircle(-4, -4, 4);

    const p = this.pips;
    p.clear();
    for (let i = 0; i < this.level; i++) {
      p.fillStyle(COLORS.yellow, 1);
      p.fillCircle(-12 + i * 12, 20, 4);
    }
  }
}
