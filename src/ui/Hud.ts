import Phaser from 'phaser';
import { STREAK_FOR_POWER_SHOT } from '../config/balance';
import { t } from '../i18n/i18n';
import { Button } from './Button';
import { addFullscreenButton } from './FullscreenButton';
import { drawIcon } from './icons';
import { COLORS, GAME_WIDTH, textStyle } from './theme';

export interface HudHandlers {
  onPause: () => void;
  onNewGame: () => void;
  onStartWave: () => void;
}

export const HUD_HEIGHT = 60;

/** Top bar: lives, coins, wave info, streak meter and the pause / fullscreen / new-game buttons. */
export class Hud extends Phaser.GameObjects.Container {
  private readonly livesText: Phaser.GameObjects.Text;
  private readonly coinsText: Phaser.GameObjects.Text;
  private readonly coinIcon: Phaser.GameObjects.Graphics;
  private readonly waveText: Phaser.GameObjects.Text;
  private readonly streakGfx: Phaser.GameObjects.Graphics;
  private readonly streakText: Phaser.GameObjects.Text;
  readonly startWave: Button;
  readonly pauseButton: Button;
  readonly newGameButton: Button;
  readonly fullscreenButton: Button | null;
  private shownCoins = -1;
  private waveKey = '-';

  constructor(scene: Phaser.Scene, handlers: HudHandlers) {
    super(scene, 0, 0);
    const bar = scene.add.graphics();
    bar.fillStyle(COLORS.panel, 1);
    bar.fillRect(0, 0, GAME_WIDTH, HUD_HEIGHT);
    bar.fillStyle(COLORS.panelBorder, 1);
    bar.fillRect(0, HUD_HEIGHT - 3, GAME_WIDTH, 3);

    const heart = scene.add.graphics().setPosition(30, 30);
    drawIcon(heart, 'heart', 30, COLORS.red);
    this.livesText = scene.add.text(52, 30, '', textStyle(28, COLORS.text, '700')).setOrigin(0, 0.5);

    this.coinIcon = scene.add.graphics().setPosition(140, 30);
    drawIcon(this.coinIcon, 'coin', 30, COLORS.yellow);
    this.coinsText = scene.add.text(162, 30, '', textStyle(28, COLORS.yellow, '700')).setOrigin(0, 0.5);

    this.waveText = scene.add.text(262, 30, '', textStyle(24, COLORS.text, '600')).setOrigin(0, 0.5);

    this.startWave = new Button(scene, 520, 30, {
      width: 200,
      height: 44,
      label: t('hud.startWave'),
      icon: 'play',
      iconSize: 18,
      fontSize: 20,
      color: COLORS.green,
      onClick: handlers.onStartWave,
    });

    this.streakGfx = scene.add.graphics();
    this.streakText = scene.add.text(660, 30, t('hud.streak'), textStyle(18, COLORS.textDim, '600')).setOrigin(0, 0.5);

    this.newGameButton = new Button(scene, GAME_WIDTH - 158, 30, {
      width: 50,
      height: 46,
      icon: 'restart',
      color: COLORS.panelLight,
      onClick: handlers.onNewGame,
    });
    this.fullscreenButton = addFullscreenButton(scene, GAME_WIDTH - 98, 30, 46);
    this.pauseButton = new Button(scene, GAME_WIDTH - 38, 30, {
      width: 50,
      height: 46,
      icon: 'pause',
      color: COLORS.primary,
      onClick: handlers.onPause,
    });

    this.add([bar, heart, this.livesText, this.coinIcon, this.coinsText, this.waveText, this.startWave, this.streakGfx, this.streakText, this.newGameButton, this.pauseButton]);
    if (this.fullscreenButton) this.add(this.fullscreenButton);
    this.setDepth(80);
    scene.add.existing(this);
    this.setStreak(0);
  }

  setLives(lives: number, pulse = false): void {
    this.livesText.setText(String(lives));
    if (pulse) {
      this.livesText.setColor('#ff4d6d');
      this.scene.tweens.add({
        targets: this.livesText,
        scale: { from: 1.5, to: 1 },
        duration: 300,
        onComplete: () => this.livesText.setColor('#ffffff'),
      });
    }
  }

  setCoins(coins: number): void {
    const gained = this.shownCoins >= 0 && coins > this.shownCoins;
    this.shownCoins = coins;
    this.coinsText.setText(String(coins));
    if (gained) this.scene.tweens.add({ targets: [this.coinsText, this.coinIcon], scale: { from: 1.3, to: 1 }, duration: 200 });
  }

  /** Wave label: during a break shows the countdown and the start button. */
  setWave(wave: number, total: number, breakSeconds: number | null): void {
    this.waveText.setText(t('hud.wave', { wave, total }));
    const key = breakSeconds === null ? '' : `${t('hud.startWave')}  ${breakSeconds}`;
    if (key === this.waveKey) return;
    this.waveKey = key;
    this.startWave.setVisible(breakSeconds !== null);
    if (breakSeconds !== null) this.startWave.setLabel(key);
  }

  setStartWaveVisible(visible: boolean): void {
    this.startWave.setVisible(visible);
  }

  setStreak(streak: number): void {
    // The label grows once there is a count ("Streak 7"), so set it before placing the circles.
    this.streakText.setText(streak >= STREAK_FOR_POWER_SHOT ? `${t('hud.streak')} ${streak}` : t('hud.streak'));
    const g = this.streakGfx;
    g.clear();
    const x0 = 660 + this.streakText.width + 14;
    const filled = streak === 0 ? 0 : ((streak - 1) % STREAK_FOR_POWER_SHOT) + 1;
    for (let i = 0; i < STREAK_FOR_POWER_SHOT; i++) {
      const on = i < filled;
      g.fillStyle(on ? (filled === STREAK_FOR_POWER_SHOT ? COLORS.yellow : COLORS.orange) : COLORS.bg, 1);
      g.fillCircle(x0 + i * 26, 30, 10);
      g.lineStyle(2, on ? COLORS.yellow : COLORS.panelBorder, 1);
      g.strokeCircle(x0 + i * 26, 30, 10);
    }
  }

  /** Screen position of the coin counter (tutorial highlight). */
  get coinsBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(118, 6, 130, 48);
  }

  get buttonsBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(GAME_WIDTH - 190, 2, 188, 56);
  }

  get streakBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(650, 6, 260, 48);
  }
}
