import Phaser from 'phaser';
import { formatNumber, notation, t } from '../i18n/i18n';
import { evaluate, format, parseKey } from '../math/expr';
import { drawBackground } from '../ui/background';
import { Button } from '../ui/Button';
import { COLORS, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';

export interface GameOverData {
  won: boolean;
  score: number;
  asked: number;
  correct: number;
  bestStreak: number;
  wave: number;
  totalWaves: number;
  newHighScore: boolean;
  /** Problem keys answered wrong this game, most recent first. */
  mistakes: string[];
  practiceKeys?: string[];
}

/** Formats a stored fact key as it is shown in the game, with the answer: "7 × 8 = 56". */
export const describeFact = (key: string): string => {
  const expr = parseKey(key);
  return `${format(expr, notation())} = ${formatNumber(evaluate(expr))}`;
};

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData): void {
    setupCamera(this);
    drawBackground(this);
    const cx = GAME_WIDTH / 2;

    const title = this.add
      .text(cx, 80, data.won ? t('over.victory') : t('over.defeat'), textStyle(80, data.won ? COLORS.yellow : COLORS.red, '700', { stroke: '#0b1026', strokeThickness: 10 }))
      .setOrigin(0.5);
    this.tweens.add({ targets: title, scale: { from: 0.4, to: 1 }, duration: 500, ease: 'Back.easeOut' });

    if (data.newHighScore) {
      const hs = this.add.text(cx, 150, t('over.newHighScore'), textStyle(30, COLORS.green, '700')).setOrigin(0.5);
      this.tweens.add({ targets: hs, scale: { from: 1, to: 1.12 }, duration: 500, yoyo: true, repeat: -1 });
    }

    const pct = data.asked > 0 ? Math.round((100 * data.correct) / data.asked) : 0;
    const stats: [string, string, number][] = [
      [t('over.score'), formatNumber(data.score), COLORS.yellow],
      [t('over.accuracy'), `${data.correct}/${data.asked} (${pct}%)`, COLORS.green],
      [t('over.bestStreak'), String(data.bestStreak), COLORS.orange],
      [t('over.wave'), `${data.wave}/${data.totalWaves}`, COLORS.cyan],
    ];
    const cardW = 250;
    stats.forEach(([label, value, color], i) => {
      const x = cx + (i - 1.5) * (cardW + 16);
      const g = this.add.graphics();
      g.fillStyle(COLORS.panel, 1);
      g.fillRoundedRect(x - cardW / 2, 190, cardW, 120, 20);
      g.lineStyle(3, color, 1);
      g.strokeRoundedRect(x - cardW / 2, 190, cardW, 120, 20);
      this.add.text(x, 222, label, textStyle(20, COLORS.textDim, '600')).setOrigin(0.5);
      this.add.text(x, 268, value, textStyle(36, color, '700')).setOrigin(0.5);
    });

    const facts = data.mistakes.slice(0, 3);
    const box = this.add.graphics();
    box.fillStyle(COLORS.panel, 1);
    box.fillRoundedRect(cx - 360, 336, 720, 200, 20);
    if (facts.length === 0) {
      this.add.text(cx, 436, data.asked > 0 ? t('over.perfect') : '', textStyle(32, COLORS.green, '700')).setOrigin(0.5);
    } else {
      this.add.text(cx - 330, 366, t('over.practise'), textStyle(24, COLORS.textDim, '600')).setOrigin(0, 0.5);
      facts.forEach((key, i) => {
        this.add.text(cx - 300, 414 + i * 42, describeFact(key), textStyle(32, COLORS.text, '700')).setOrigin(0, 0.5);
      });
      new Button(this, cx + 220, 470, {
        width: 230,
        height: 64,
        label: t('progress.practiseThese'),
        color: COLORS.purple,
        fontSize: 22,
        onClick: () => this.scene.start('Game', { practiceKeys: data.mistakes.slice(0, 10) }),
      });
    }

    new Button(this, cx - 160, 620, {
      width: 290,
      height: 84,
      label: t('over.playAgain'),
      icon: 'restart',
      color: COLORS.green,
      onClick: () => this.playAgain(data),
    });
    new Button(this, cx + 160, 620, {
      width: 290,
      height: 84,
      label: t('over.menu'),
      icon: 'back',
      color: COLORS.primary,
      onClick: () => this.scene.start('Menu'),
    });

    this.input.keyboard?.on('keydown-ENTER', () => this.playAgain(data));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  private playAgain(data: GameOverData): void {
    this.scene.start('Game', { practiceKeys: data.practiceKeys });
  }
}
