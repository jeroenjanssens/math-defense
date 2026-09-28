import Phaser from 'phaser';
import { TOWER_TYPES, TOWERS, type TowerType } from '../config/balance';
import { MAP_HEIGHT, MAP_WIDTH, MAP_X, MAP_Y } from '../config/map';
import type { Tower } from '../entities/Tower';
import { t } from '../i18n/i18n';
import { Button } from './Button';
import { drawIcon } from './icons';
import { COLORS, shade, textStyle } from './theme';

export interface BuildMenuHandlers {
  getCoins: () => number;
  onBuild: (spot: number, kind: TowerType) => void;
  onUpgrade: (tower: Tower) => void;
  onSell: (tower: Tower) => void;
  onClose?: () => void;
}

const CARD_W = 150;
const CARD_H = 150;
const PAD = 12;

/** Draws a small picture of a tower type for the build menu. */
const drawTowerPreview = (g: Phaser.GameObjects.Graphics, kind: TowerType, x: number, y: number): void => {
  const color = TOWERS[kind].color;
  g.fillStyle(shade(COLORS.panelLight, -0.1), 1);
  g.fillRoundedRect(x - 20, y - 20, 40, 40, 10);
  g.lineStyle(3, shade(color, -0.3), 1);
  g.strokeRoundedRect(x - 20, y - 20, 40, 40, 10);
  g.fillStyle(shade(color, -0.35), 1);
  if (kind === 'blaster') g.fillRoundedRect(x + 2, y - 3, 20, 6, 3);
  if (kind === 'splash') g.fillRoundedRect(x, y - 7, 20, 14, 4);
  if (kind === 'freezer') {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
      g.fillCircle(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 5);
    }
  }
  g.fillStyle(color, 1);
  g.fillCircle(x, y, 12);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(x - 4, y - 4, 4);
};

/** Popup next to a build spot or tower: choose a tower to build, or upgrade/sell an existing one. */
export class BuildMenu {
  private container?: Phaser.GameObjects.Container;
  private blocker?: Phaser.GameObjects.Rectangle;
  private tower?: Tower;
  private spot: number | null = null;
  private refreshers: (() => void)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly handlers: BuildMenuHandlers,
  ) {}

  get isOpen(): boolean {
    return this.container !== undefined;
  }

  get openSpot(): number | null {
    return this.spot;
  }

  openBuild(spot: number, x: number, y: number, only?: TowerType): void {
    this.close();
    this.spot = spot;
    const types = only ? [only] : TOWER_TYPES;
    const w = types.length * CARD_W + (types.length + 1) * PAD;
    const h = CARD_H + 54 + PAD;
    const c = this.open(x, y, w, h);
    c.add(this.scene.add.text(0, -h / 2 + 24, t('build.title'), textStyle(22, COLORS.text, '700')).setOrigin(0.5));

    types.forEach((kind, i) => {
      const bx = -w / 2 + PAD + CARD_W / 2 + i * (CARD_W + PAD);
      const by = -h / 2 + 46 + CARD_H / 2;
      const cost = TOWERS[kind].cost;
      const card = new Button(this.scene, bx, by, {
        width: CARD_W,
        height: CARD_H,
        color: COLORS.panelLight,
        onClick: () => {
          if (this.handlers.getCoins() < cost) return;
          this.close();
          this.handlers.onBuild(spot, kind);
        },
      });
      const g = this.scene.add.graphics();
      drawTowerPreview(g, kind, 0, -38);
      const name = this.scene.add.text(0, 6, t(`build.${kind}`), textStyle(20, COLORS.text, '700')).setOrigin(0.5);
      const desc = this.scene.add
        .text(0, 32, t(`build.${kind}.desc`), textStyle(13, COLORS.textDim, '500', { align: 'center', wordWrap: { width: CARD_W - 16 } }))
        .setOrigin(0.5);
      const coin = this.scene.add.graphics().setPosition(-22, 60);
      drawIcon(coin, 'coin', 20, COLORS.yellow);
      const price = this.scene.add.text(-8, 60, String(cost), textStyle(20, COLORS.yellow, '700')).setOrigin(0, 0.5);
      card.add([g, name, desc, coin, price]);
      c.add(card);
      this.refreshers.push(() => {
        const ok = this.handlers.getCoins() >= cost;
        card.setAlpha(ok ? 1 : 0.45);
        price.setColor(ok ? '#ffd60a' : '#ff4d6d');
      });
    });
    this.refresh();
  }

  openTower(tower: Tower): void {
    this.close();
    this.tower = tower;
    tower.showRange(true);
    const w = 2 * CARD_W + 3 * PAD;
    const h = 170;
    const c = this.open(tower.x, tower.y, w, h);
    c.add(
      this.scene.add
        .text(0, -h / 2 + 24, `${t(`build.${tower.kind}`)}  ·  ${t('build.level', { level: tower.level })}`, textStyle(20, COLORS.text, '700'))
        .setOrigin(0.5),
    );

    const by = 10;
    const upgrade = new Button(this.scene, -CARD_W / 2 - PAD / 2, by, {
      width: CARD_W,
      height: 96,
      color: COLORS.green,
      onClick: () => {
        if (!tower.canUpgrade || this.handlers.getCoins() < tower.upgradeCost) return;
        this.handlers.onUpgrade(tower);
        this.openTower(tower);
      },
    });
    const upLabel = this.scene.add
      .text(0, -18, tower.canUpgrade ? t('build.upgrade') : t('build.maxLevel'), textStyle(20, COLORS.text, '700'))
      .setOrigin(0.5);
    upgrade.add(upLabel);
    if (tower.canUpgrade) {
      const coin = this.scene.add.graphics().setPosition(-22, 18);
      drawIcon(coin, 'coin', 20, COLORS.yellow);
      const price = this.scene.add.text(-8, 18, String(tower.upgradeCost), textStyle(20, COLORS.yellow, '700')).setOrigin(0, 0.5);
      upgrade.add([coin, price]);
      this.refreshers.push(() => {
        const ok = this.handlers.getCoins() >= tower.upgradeCost;
        upgrade.setAlpha(ok ? 1 : 0.45);
        price.setColor(ok ? '#ffd60a' : '#ff4d6d');
      });
    } else {
      upgrade.setEnabled(false);
    }

    const sell = new Button(this.scene, CARD_W / 2 + PAD / 2, by, {
      width: CARD_W,
      height: 96,
      color: COLORS.red,
      onClick: () => {
        this.close();
        this.handlers.onSell(tower);
      },
    });
    const sellCoin = this.scene.add.graphics().setPosition(-22, 18);
    drawIcon(sellCoin, 'coin', 20, COLORS.yellow);
    sell.add([
      this.scene.add.text(0, -18, t('build.sell'), textStyle(20, COLORS.text, '700')).setOrigin(0.5),
      sellCoin,
      this.scene.add.text(-8, 18, `+${tower.sellValue}`, textStyle(20, COLORS.yellow, '700')).setOrigin(0, 0.5),
    ]);
    c.add([upgrade, sell]);
    this.refresh();
  }

  /** Update affordability (coins change while the menu is open). */
  refresh(): void {
    this.refreshers.forEach((fn) => fn());
  }

  close(): void {
    if (!this.container) return;
    this.tower?.showRange(false);
    this.tower = undefined;
    this.spot = null;
    this.refreshers = [];
    this.container.destroy();
    this.blocker?.destroy();
    this.container = undefined;
    this.blocker = undefined;
    this.handlers.onClose?.();
  }

  private open(x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
    // Tapping anywhere on the map outside the popup closes it.
    this.blocker = this.scene.add
      .rectangle(MAP_X + MAP_WIDTH / 2, MAP_Y + MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 0x000000, 0.25)
      .setDepth(90)
      .setInteractive();
    this.blocker.on('pointerup', () => this.close());

    // Show the popup above the spot if there is room, otherwise below; keep it on the map.
    let py = y - 50 - h / 2;
    if (py - h / 2 < MAP_Y + 4) py = y + 50 + h / 2;
    const px = Phaser.Math.Clamp(x, MAP_X + w / 2 + 6, MAP_X + MAP_WIDTH - w / 2 - 6);
    py = Phaser.Math.Clamp(py, MAP_Y + h / 2 + 6, MAP_Y + MAP_HEIGHT - h / 2 - 6);

    const c = this.scene.add.container(px, py).setDepth(91);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.4);
    bg.fillRoundedRect(-w / 2 + 4, -h / 2 + 8, w, h, 20);
    bg.fillStyle(COLORS.panel, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    bg.lineStyle(4, COLORS.panelBorder, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
    // Swallow clicks on the panel background so they don't close it.
    const hit = this.scene.add.rectangle(0, 0, w, h, 0, 0).setInteractive();
    c.add([hit, bg]);
    c.setScale(0.8).setAlpha(0);
    this.scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 140, ease: 'Back.easeOut' });
    this.container = c;
    return c;
  }
}
