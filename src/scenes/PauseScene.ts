import Phaser from 'phaser';
import { t } from '../i18n/i18n';
import { Button } from '../ui/Button';
import { confirmDialog } from '../ui/Dialog';
import { addFullscreenButton } from '../ui/FullscreenButton';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';
import type { GameScene } from './GameScene';

/** Overlay on top of the (paused) game. */
export class PauseScene extends Phaser.Scene {
  private busy = false;

  constructor() {
    super('Pause');
  }

  create(): void {
    setupCamera(this);
    this.busy = false;
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05081a, 0.75).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 1);
    panel.fillRoundedRect(cx - 230, 110, 460, 500, 28);
    panel.lineStyle(4, COLORS.panelBorder, 1);
    panel.strokeRoundedRect(cx - 230, 110, 460, 500, 28);

    this.add.text(cx, 170, t('pause.title'), textStyle(52, COLORS.yellow, '700')).setOrigin(0.5);

    const buttons: [string, number, () => void, 'play' | 'gear' | 'restart' | 'back'][] = [
      [t('pause.resume'), COLORS.green, () => this.resume(), 'play'],
      [t('pause.settings'), COLORS.primary, () => this.openSettings(), 'gear'],
      [t('pause.newGame'), COLORS.orange, () => void this.newGame(), 'restart'],
      [t('pause.menu'), COLORS.panelLight, () => this.toMenu(), 'back'],
    ];
    buttons.forEach(([label, color, onClick, icon], i) => {
      new Button(this, cx, 260 + i * 88, { width: 360, height: 72, label, color, onClick, icon, iconSize: 26 });
    });

    addFullscreenButton(this, GAME_WIDTH - 98, 30, 46);

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.busy) return;
      if (event.key === 'Escape' || event.key === 'p' || event.key === 'P' || event.key === 'Enter') this.resume();
    });
  }

  private get game0(): GameScene {
    return this.scene.get('Game') as GameScene;
  }

  private resume(): void {
    if (this.busy) return;
    this.scene.resume('Game');
    this.scene.stop();
  }

  private openSettings(): void {
    if (this.busy) return;
    this.scene.launch('Settings', { from: 'pause' });
    this.scene.sleep();
  }

  private async newGame(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const ok = await confirmDialog(this, t('hud.newGameConfirm'));
    this.busy = false;
    if (!ok) return;
    this.scene.stop();
    this.game0.restartGame();
  }

  private toMenu(): void {
    if (this.busy) return;
    this.scene.stop();
    this.game0.quitToMenu();
  }
}
