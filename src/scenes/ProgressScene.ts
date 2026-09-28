import Phaser from 'phaser';
import type { TranslationKey } from '../i18n/en';
import { formatDate, formatNumber, notation, t } from '../i18n/i18n';
import type { FactCategory } from '../math/types';
import { categorySummary, mastery, totals, weakestFacts, type Mastery } from '../profiles/progress';
import { requireProfile } from '../state/session';
import { drawBackground } from '../ui/background';
import { Button } from '../ui/Button';
import { COLORS, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';
import { describeFact } from './GameOverScene';

const MASTERY_COLORS: Record<Mastery, number> = {
  good: COLORS.green,
  ok: COLORS.orange,
  bad: COLORS.red,
  none: 0x2a3366,
};

const CATEGORIES: FactCategory[] = ['multiplication', 'division', 'addition', 'subtraction', 'mixed'];

const GRID_X = 40;
const GRID_Y = 118;
const CELL = 37;
const RIGHT_X = 580;

/** Progress overview for the current profile: table grid, per-category accuracy, weak facts, history. */
export class ProgressScene extends Phaser.Scene {
  private detail!: Phaser.GameObjects.Text;
  private selection!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Progress');
  }

  create(): void {
    setupCamera(this);
    drawBackground(this, false);
    const profile = requireProfile();
    const progress = profile.progress;

    new Button(this, 60, 44, { width: 90, height: 56, icon: 'back', color: COLORS.panelLight, onClick: () => this.back() });
    this.add.text(GAME_WIDTH / 2, 44, t('progress.title', { name: profile.name }), textStyle(40, COLORS.yellow, '700')).setOrigin(0.5);

    this.drawGrid();
    this.drawCategories();
    this.drawWeakFacts();
    this.drawSessions();

    const total = totals(progress);
    const pct = total.asked > 0 ? Math.round((100 * total.correct) / total.asked) : 0;
    this.add
      .text(GAME_WIDTH - 40, 44, total.asked > 0 ? t('progress.totals', { asked: formatNumber(total.asked), pct }) : '', textStyle(20, COLORS.textDim, '600'))
      .setOrigin(1, 0.5);

    this.input.keyboard?.on('keydown-ESC', () => this.back());
  }

  private back(): void {
    this.scene.start('Menu');
  }

  private panel(x: number, y: number, w: number, h: number, title: string): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 0.92);
    g.fillRoundedRect(x, y, w, h, 18);
    g.lineStyle(3, COLORS.panelBorder, 1);
    g.strokeRoundedRect(x, y, w, h, 18);
    this.add.text(x + 18, y + 22, title, textStyle(22, COLORS.text, '700')).setOrigin(0, 0.5);
  }

  // ---------------------------------------------------------------- 12×12 grid

  private drawGrid(): void {
    const progress = requireProfile().progress;
    const size = 13 * CELL;
    this.panel(GRID_X - 16, GRID_Y - 38, size + 32, size + 150, t('progress.grid'));
    const top = GRID_Y + 12;
    const times = notation().times;
    const g = this.add.graphics();
    this.add.text(GRID_X + CELL / 2, top + CELL / 2, times, textStyle(20, COLORS.textDim, '700')).setOrigin(0.5);

    for (let i = 1; i <= 12; i++) {
      this.add.text(GRID_X + i * CELL + CELL / 2, top + CELL / 2, String(i), textStyle(17, COLORS.textDim, '700')).setOrigin(0.5);
      this.add.text(GRID_X + CELL / 2, top + i * CELL + CELL / 2, String(i), textStyle(17, COLORS.textDim, '700')).setOrigin(0.5);
    }
    for (let a = 1; a <= 12; a++) {
      for (let b = 1; b <= 12; b++) {
        const key = `${a}*${b}`;
        const m = mastery(progress.facts[key]);
        const x = GRID_X + b * CELL;
        const y = top + a * CELL;
        g.fillStyle(MASTERY_COLORS[m], m === 'none' ? 1 : 0.9);
        g.fillRoundedRect(x + 2, y + 2, CELL - 4, CELL - 4, 6);
        const hit = this.add.rectangle(x + CELL / 2, y + CELL / 2, CELL, CELL, 0, 0).setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => this.showDetail(key, x, y));
      }
    }
    this.selection = this.add.graphics();

    // Legend
    const legendY = top + 13 * CELL + 22;
    const order: Mastery[] = ['good', 'ok', 'bad', 'none'];
    let lx = GRID_X;
    for (const m of order) {
      g.fillStyle(MASTERY_COLORS[m], 1);
      g.fillRoundedRect(lx, legendY - 10, 20, 20, 5);
      const label = this.add.text(lx + 28, legendY, t(`progress.legend.${m}` as TranslationKey), textStyle(17, COLORS.textDim, '600')).setOrigin(0, 0.5);
      lx += 28 + label.width + 24;
    }
    this.detail = this.add.text(GRID_X, legendY + 38, '', textStyle(19, COLORS.text, '600')).setOrigin(0, 0.5);
  }

  private showDetail(key: string, x: number, y: number): void {
    const stat = requireProfile().progress.facts[key];
    this.selection.clear();
    this.selection.lineStyle(3, COLORS.yellow, 1);
    this.selection.strokeRoundedRect(x, y, CELL, CELL, 8);
    const fact = describeFact(key);
    if (!stat) {
      this.detail.setText(`${fact}  ·  ${t('progress.legend.none')}`);
      return;
    }
    const avg = stat.c > 0 ? `  ·  ${formatNumber(Math.round(stat.ms / stat.c / 100) / 10)} s` : '';
    this.detail.setText(`${fact}  ·  ${stat.c}/${stat.n}${avg}`);
  }

  // ---------------------------------------------------------------- categories

  private drawCategories(): void {
    const summary = categorySummary(requireProfile().progress);
    const w = GAME_WIDTH - RIGHT_X - 40;
    this.panel(RIGHT_X, 80, w, 222, t('progress.categories'));
    const barX = RIGHT_X + 150;
    const barW = w - 150 - 110;
    CATEGORIES.forEach((cat, i) => {
      const y = 132 + i * 36;
      const { asked, correct } = summary[cat];
      this.add.text(RIGHT_X + 20, y, t(`progress.cat.${cat}` as TranslationKey), textStyle(19, COLORS.text, '600')).setOrigin(0, 0.5);
      const g = this.add.graphics();
      g.fillStyle(COLORS.bg, 1);
      g.fillRoundedRect(barX, y - 10, barW, 20, 10);
      const frac = asked > 0 ? correct / asked : 0;
      const color = frac >= 0.8 ? COLORS.green : frac >= 0.6 ? COLORS.orange : COLORS.red;
      if (asked > 0) {
        g.fillStyle(color, 1);
        g.fillRoundedRect(barX, y - 10, Math.max(20, barW * frac), 20, 10);
      }
      this.add
        .text(barX + barW + 12, y, asked > 0 ? `${Math.round(frac * 100)}%  (${asked})` : '–', textStyle(17, COLORS.textDim, '600'))
        .setOrigin(0, 0.5);
    });
  }

  // ---------------------------------------------------------------- weak facts

  private drawWeakFacts(): void {
    const progress = requireProfile().progress;
    const weak = weakestFacts(progress, 8);
    const w = GAME_WIDTH - RIGHT_X - 40;
    const y0 = 318;
    this.panel(RIGHT_X, y0, w, 208, t('progress.needsPractice'));
    if (weak.length === 0) {
      const empty = Object.keys(progress.facts).length === 0 ? t('progress.nothingYet') : t('progress.allGood');
      this.add.text(RIGHT_X + w / 2, y0 + 112, empty, textStyle(24, COLORS.textDim, '600')).setOrigin(0.5);
      return;
    }
    weak.forEach((key, i) => {
      const col = Math.floor(i / 4);
      const row = i % 4;
      this.add
        .text(RIGHT_X + 24 + col * 220, y0 + 62 + row * 36, describeFact(key), textStyle(22, COLORS.text, '700'))
        .setOrigin(0, 0.5);
    });
    new Button(this, RIGHT_X + w - 120, y0 + 120, {
      width: 200,
      height: 72,
      label: t('progress.practiseThese'),
      icon: 'play',
      iconSize: 20,
      fontSize: 20,
      color: COLORS.purple,
      onClick: () => this.scene.start('Game', { practiceKeys: weak }),
    });
  }

  // ---------------------------------------------------------------- sessions

  private drawSessions(): void {
    const sessions = requireProfile().progress.sessions.slice(-4).reverse();
    const w = GAME_WIDTH - RIGHT_X - 40;
    const y0 = 542;
    this.panel(RIGHT_X, y0, w, 162, t('progress.sessions'));
    if (sessions.length === 0) {
      this.add.text(RIGHT_X + w / 2, y0 + 92, t('progress.nothingYet'), textStyle(20, COLORS.textDim, '600')).setOrigin(0.5);
      return;
    }
    sessions.forEach((s, i) => {
      const line = t('progress.sessionLine', { date: formatDate(s.date), correct: s.correct, asked: s.asked, wave: s.wave });
      this.add.text(RIGHT_X + 24, y0 + 56 + i * 28, line, textStyle(17, s.won ? COLORS.green : COLORS.text, '500')).setOrigin(0, 0.5);
    });
  }
}
