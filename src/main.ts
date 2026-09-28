import Phaser from 'phaser';

class HelloScene extends Phaser.Scene {
  create() {
    this.add
      .text(640, 360, 'Math Defense', { fontSize: '64px', color: '#ffffff' })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1026',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [HelloScene],
});
