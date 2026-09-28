import Phaser from 'phaser';
import { t } from '../i18n/i18n';
import { isGuest, requireProfile } from '../state/session';
import { drawAvatar } from '../ui/avatar';
import { drawBackground } from '../ui/background';
import { Button } from '../ui/Button';
import { addFullscreenButton } from '../ui/FullscreenButton';
import { COLORS, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    setupCamera(this);
    drawBackground(this);
    const profile = requireProfile();
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 80, t('app.title'), textStyle(76, COLORS.yellow, '700', { stroke: '#0b1026', strokeThickness: 8 })).setOrigin(0.5);

    const avatar = this.add.graphics();
    drawAvatar(avatar, profile.avatar, 42);
    avatar.setPosition(cx - 150, 190);
    this.tweens.add({ targets: avatar, y: 182, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(cx - 90, 170, t('menu.hello', { name: profile.name }), textStyle(40, COLORS.text, '600')).setOrigin(0, 0.5);
    this.add
      .text(
        cx - 90,
        212,
        isGuest()
          ? t('menu.guestNote')
          : `${t('menu.highScore', { score: profile.highScore })}   ·   ${t('menu.bestWave', { wave: profile.bestWave })}`,
        textStyle(20, COLORS.textDim, '500'),
      )
      .setOrigin(0, 0.5);

    const play = new Button(this, cx, 320, {
      width: 380,
      height: 96,
      label: t('menu.play'),
      icon: 'play',
      color: COLORS.green,
      fontSize: 40,
      onClick: () => this.play(),
    });
    this.tweens.add({ targets: play, scale: 1.04, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const small = [
      { label: t('menu.settings'), icon: 'gear' as const, color: COLORS.primary, scene: 'Settings' },
      { label: t('menu.progress'), icon: 'chart' as const, color: COLORS.purple, scene: 'Progress' },
    ];
    small.forEach((b, i) => {
      new Button(this, cx + (i === 0 ? -100 : 100), 440, {
        width: 185,
        height: 76,
        label: b.label,
        icon: b.icon,
        color: b.color,
        fontSize: 22,
        onClick: () => this.scene.start(b.scene, { from: 'menu' }),
      });
    });
    new Button(this, cx - 100, 540, {
      width: 185,
      height: 66,
      label: t('menu.tutorial'),
      icon: 'question',
      color: COLORS.orange,
      fontSize: 22,
      onClick: () => this.scene.start('Game', { tutorial: true }),
    });
    new Button(this, cx + 100, 540, {
      width: 185,
      height: 66,
      label: t('menu.switchProfile'),
      icon: 'back',
      color: COLORS.grey,
      fontSize: 20,
      onClick: () => this.scene.start('Profiles'),
    });

    addFullscreenButton(this, GAME_WIDTH - 44, 44);

    this.input.keyboard?.on('keydown-ENTER', () => this.play());
  }

  private play(): void {
    const profile = requireProfile();
    this.scene.start('Game', { tutorial: !profile.tutorialDone });
  }
}
