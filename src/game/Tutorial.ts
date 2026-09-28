import Phaser from 'phaser';
import { STREAK_FOR_POWER_SHOT, TOWER_TYPES } from '../config/balance';
import type { TranslationKey } from '../i18n/en';
import { t } from '../i18n/i18n';
import { drawTowerPreview } from '../ui/BuildMenu';
import { Button } from '../ui/Button';
import { COLORS, textStyle } from '../ui/theme';
import type { PathPoint } from './Path';

export type TutorialStep = 'path' | 'answer' | 'coins' | 'towers' | 'build' | 'upgrade' | 'streak' | 'buttons';
const STEPS: TutorialStep[] = ['path', 'answer', 'coins', 'towers', 'build', 'upgrade', 'streak', 'buttons'];
export type TutorialEvent = 'correct' | 'built' | 'upgraded';

/** Steps that wait for the player to do something instead of pressing "Next". */
const WAIT_FOR: Partial<Record<TutorialStep, TutorialEvent>> = { answer: 'correct', build: 'built', upgrade: 'upgraded' };

export interface TutorialHost {
  path: PathPoint[];
  answerBounds: Phaser.Geom.Rectangle;
  coinsBounds: Phaser.Geom.Rectangle;
  streakBounds: Phaser.Geom.Rectangle;
  buttonsBounds: Phaser.Geom.Rectangle;
  buildSpot: { x: number; y: number };
  /** Where the tower to upgrade stands (the one just built). */
  upgradeSpot: () => { x: number; y: number };
  onStep: (step: TutorialStep) => void;
  onDone: () => void;
  onSkip: () => void;
}

const BUBBLE_X = 450;
const BUBBLE_Y = 652;
const BUBBLE_W = 820;
const BUBBLE_H = 118;
const TEXT_SIZE = 26;
const TOWER_CARD_W = 180;
const TOWER_CARD_H = 130;

/** Guided first game: highlights one thing at a time with a short explanation. */
export class Tutorial {
  private index = -1;
  private readonly layer: Phaser.GameObjects.Container;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private readonly nextButton: Button;
  private readonly towersCard: Phaser.GameObjects.Container;
  private readonly pulse: Phaser.Tweens.Tween;
  finished = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: TutorialHost,
  ) {
    this.highlight = scene.add.graphics().setDepth(85);
    this.pulse = scene.tweens.add({ targets: this.highlight, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1 });

    const bubble = scene.add.graphics();
    bubble.fillStyle(0x000000, 0.4);
    bubble.fillRoundedRect(-BUBBLE_W / 2 + 4, -BUBBLE_H / 2 + 6, BUBBLE_W, BUBBLE_H, 22);
    bubble.fillStyle(COLORS.panel, 0.97);
    bubble.fillRoundedRect(-BUBBLE_W / 2, -BUBBLE_H / 2, BUBBLE_W, BUBBLE_H, 22);
    bubble.lineStyle(4, COLORS.yellow, 1);
    bubble.strokeRoundedRect(-BUBBLE_W / 2, -BUBBLE_H / 2, BUBBLE_W, BUBBLE_H, 22);
    const blocker = scene.add.rectangle(0, 0, BUBBLE_W, BUBBLE_H, 0, 0).setInteractive();

    this.text = scene.add
      .text(-BUBBLE_W / 2 + 28, -12, '', textStyle(TEXT_SIZE, COLORS.text, '600', { wordWrap: { width: BUBBLE_W - 260 } }))
      .setOrigin(0, 0.5);
    this.nextButton = new Button(scene, BUBBLE_W / 2 - 110, -12, {
      width: 180,
      height: 60,
      label: t('tutorial.next'),
      color: COLORS.green,
      onClick: () => this.next(),
    });
    const skip = scene.add
      .text(BUBBLE_W / 2 - 110, 38, t('tutorial.skip'), textStyle(16, COLORS.textDim, '500'))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    skip.on('pointerup', () => this.skip());

    this.layer = scene.add.container(BUBBLE_X, BUBBLE_Y, [blocker, bubble, this.text, this.nextButton, skip]).setDepth(95);
    this.towersCard = this.createTowersCard();
  }

  /** The three tower types with what they do, shown above the bubble in the "towers" step. */
  private createTowersCard(): Phaser.GameObjects.Container {
    const pad = 14;
    const w = TOWER_TYPES.length * TOWER_CARD_W + (TOWER_TYPES.length + 1) * pad;
    const h = TOWER_CARD_H + 2 * pad;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.4);
    bg.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 22);
    bg.fillStyle(COLORS.panel, 0.97);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    bg.lineStyle(4, COLORS.yellow, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
    const items: Phaser.GameObjects.GameObject[] = [bg];
    TOWER_TYPES.forEach((kind, i) => {
      const x = -w / 2 + pad + TOWER_CARD_W / 2 + i * (TOWER_CARD_W + pad);
      const g = this.scene.add.graphics();
      g.fillStyle(COLORS.panelLight, 1);
      g.fillRoundedRect(x - TOWER_CARD_W / 2, -TOWER_CARD_H / 2, TOWER_CARD_W, TOWER_CARD_H, 16);
      drawTowerPreview(g, kind, x, -30);
      items.push(
        g,
        this.scene.add.text(x, 12, t(`build.${kind}`), textStyle(22, COLORS.text, '700')).setOrigin(0.5),
        this.scene.add
          .text(x, 42, t(`build.${kind}.desc`), textStyle(16, COLORS.textDim, '500', { align: 'center', wordWrap: { width: TOWER_CARD_W - 16 } }))
          .setOrigin(0.5),
      );
    });
    const top = BUBBLE_Y - BUBBLE_H / 2 - 16 - h / 2;
    return this.scene.add.container(BUBBLE_X, top, items).setDepth(95).setVisible(false);
  }

  get step(): TutorialStep | null {
    return STEPS[this.index] ?? null;
  }

  /** True while the current step waits for the "Next" button (Enter also works then). */
  get waitingForNext(): boolean {
    const step = this.step;
    return step !== null && !WAIT_FOR[step];
  }

  start(): void {
    this.index = -1;
    this.next();
  }

  next(): void {
    if (this.finished) return;
    this.index++;
    const step = this.step;
    if (!step) {
      this.finish();
      this.host.onDone();
      return;
    }
    this.setText(t(`tutorial.${step}` as TranslationKey, { n: STREAK_FOR_POWER_SHOT }));
    this.towersCard.setVisible(step === 'towers');
    const last = this.index === STEPS.length - 1;
    this.nextButton.setLabel(last ? t('tutorial.done') : t('tutorial.next'));
    this.nextButton.setVisible(!WAIT_FOR[step]);
    this.drawHighlight(step);
    this.scene.tweens.add({ targets: this.layer, scale: { from: 0.92, to: 1 }, duration: 200, ease: 'Back.easeOut' });
    this.host.onStep(step);
  }

  /** Something happened in the game; advances steps that wait for it. */
  notify(event: TutorialEvent): void {
    const step = this.step;
    if (step && WAIT_FOR[step] === event) this.next();
  }

  /** Longer explanations get a smaller font so they fit in the bubble. */
  private setText(text: string): void {
    let size = TEXT_SIZE;
    this.text.setFontSize(size).setText(text);
    while (this.text.height > BUBBLE_H - 16 && size > 18) {
      size -= 2;
      this.text.setFontSize(size);
    }
  }

  skip(): void {
    if (this.finished) return;
    this.finish();
    this.host.onSkip();
  }

  private finish(): void {
    this.finished = true;
    this.pulse.stop();
    this.highlight.destroy();
    this.layer.destroy();
    this.towersCard.destroy();
  }

  destroy(): void {
    if (!this.finished) this.finish();
  }

  private drawHighlight(step: TutorialStep): void {
    const g = this.highlight;
    g.clear();
    g.lineStyle(6, COLORS.yellow, 1);
    const box = (r: Phaser.Geom.Rectangle): void => {
      g.strokeRoundedRect(r.x - 6, r.y - 6, r.width + 12, r.height + 12, 16);
    };
    switch (step) {
      case 'path': {
        const pts = this.host.path;
        g.lineStyle(10, COLORS.yellow, 0.8);
        g.beginPath();
        g.moveTo(Math.max(pts[0].x, 10), pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.strokePath();
        const end = pts[pts.length - 1];
        g.lineStyle(6, COLORS.yellow, 1);
        g.strokeCircle(end.x, end.y, 44);
        break;
      }
      case 'answer':
        box(this.host.answerBounds);
        break;
      case 'coins':
        box(this.host.coinsBounds);
        break;
      case 'streak':
        box(this.host.streakBounds);
        break;
      case 'buttons':
        box(this.host.buttonsBounds);
        break;
      case 'build':
      case 'upgrade': {
        const { x, y } = step === 'build' ? this.host.buildSpot : this.host.upgradeSpot();
        g.strokeCircle(x, y, 40);
        g.fillStyle(COLORS.yellow, 1);
        g.fillTriangle(x - 14, y - 70, x + 14, y - 70, x, y - 48);
        break;
      }
    }
  }
}
