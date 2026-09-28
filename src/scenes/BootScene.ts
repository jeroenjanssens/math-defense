import Phaser from 'phaser';
import { profileStore } from '../profiles/profileStore';
import { deviceLanguage } from '../state/session';
import { setLanguage } from '../i18n/i18n';

/** Creates the few generated textures and decides where to start. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('dot', 16, 16);
    g.destroy();

    setLanguage(deviceLanguage());
    profileStore();
    this.scene.start('Profiles');
  }
}
