import Phaser from 'phaser';
import { t } from '../i18n/i18n';
import { Button, HoldButton } from './Button';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, textStyle } from './theme';

/** A dimmed full-screen layer that swallows input, with a rounded panel in the middle. */
export class Overlay extends Phaser.GameObjects.Container {
  readonly panel: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, width: number, height: number, dim = 0.65) {
    super(scene, 0, 0);
    const blocker = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, dim)
      .setInteractive();
    this.panel = scene.add.graphics();
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - height) / 2;
    this.panel.fillStyle(0x000000, 0.35);
    this.panel.fillRoundedRect(x + 6, y + 10, width, height, 24);
    this.panel.fillStyle(COLORS.panel, 1);
    this.panel.fillRoundedRect(x, y, width, height, 24);
    this.panel.lineStyle(4, COLORS.panelBorder, 1);
    this.panel.strokeRoundedRect(x, y, width, height, 24);
    this.add([blocker, this.panel]);
    this.setDepth(1000);
    scene.add.existing(this);
    this.setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 120 });
  }

  close(): void {
    this.destroy();
  }
}

export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  /** Require holding the confirm button for 3 seconds (parent lock). */
  hold?: boolean;
  danger?: boolean;
}

export const confirmDialog = (scene: Phaser.Scene, message: string, options: ConfirmOptions = {}): Promise<boolean> =>
  new Promise((resolve) => {
    const overlay = new Overlay(scene, 620, 300);
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const text = scene.add
      .text(cx, cy - 60, message, textStyle(30, COLORS.text, '600', { align: 'center', wordWrap: { width: 540 } }))
      .setOrigin(0.5);
    overlay.add(text);
    const done = (result: boolean) => {
      overlay.close();
      resolve(result);
    };
    const confirmColor = options.danger ? COLORS.red : COLORS.green;
    const confirmLabel = options.confirmLabel ?? t('common.yes');
    const confirm = options.hold
      ? new HoldButton(scene, cx + 140, cy + 70, {
          width: 250,
          height: 72,
          label: confirmLabel,
          color: confirmColor,
          onClick: () => done(true),
        })
      : new Button(scene, cx + 140, cy + 70, {
          width: 250,
          height: 72,
          label: confirmLabel,
          color: confirmColor,
          onClick: () => done(true),
        });
    const cancel = new Button(scene, cx - 140, cy + 70, {
      width: 250,
      height: 72,
      label: options.cancelLabel ?? t('common.no'),
      color: COLORS.grey,
      onClick: () => done(false),
    });
    overlay.add([confirm, cancel]);
    if (options.hold) {
      overlay.add(
        scene.add.text(cx + 140, cy + 125, t('common.holdToConfirm'), textStyle(16, COLORS.textDim, '500')).setOrigin(0.5),
      );
    }
  });

export const alertDialog = (scene: Phaser.Scene, message: string): Promise<void> =>
  new Promise((resolve) => {
    const overlay = new Overlay(scene, 600, 260);
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    overlay.add(
      scene.add
        .text(cx, cy - 40, message, textStyle(28, COLORS.text, '600', { align: 'center', wordWrap: { width: 520 } }))
        .setOrigin(0.5),
    );
    overlay.add(
      new Button(scene, cx, cy + 70, {
        width: 220,
        height: 68,
        label: t('common.ok'),
        onClick: () => {
          overlay.close();
          resolve();
        },
      }),
    );
  });

/** A short message that floats in and fades out. */
export const showToast = (scene: Phaser.Scene, message: string, color: number = COLORS.text, y = 110): void => {
  const text = scene.add
    .text(GAME_WIDTH / 2, y, message, textStyle(30, color, '700', { stroke: '#0b1026', strokeThickness: 6 }))
    .setOrigin(0.5)
    .setDepth(1100)
    .setAlpha(0);
  scene.tweens.chain({
    targets: text,
    tweens: [
      { alpha: 1, y: y - 10, duration: 200 },
      { alpha: 1, duration: 1400 },
      { alpha: 0, y: y - 30, duration: 300 },
    ],
    onComplete: () => text.destroy(),
  });
};
