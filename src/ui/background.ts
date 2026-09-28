import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './theme';
import { drawShape, type ShapeKind } from './shapes';

/** Dark starry background with a few slowly drifting shapes, used by the menu screens. */
export const drawBackground = (scene: Phaser.Scene, drifting = true): void => {
  const g = scene.add.graphics().setDepth(-10);
  g.fillGradientStyle(COLORS.bg, COLORS.bg, COLORS.bgLight, COLORS.bgLight, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const rng = new Phaser.Math.RandomDataGenerator(['stars']);
  for (let i = 0; i < 90; i++) {
    g.fillStyle(0xffffff, rng.realInRange(0.08, 0.4));
    g.fillCircle(rng.between(0, GAME_WIDTH), rng.between(0, GAME_HEIGHT), rng.realInRange(0.8, 2.2));
  }
  if (!drifting) return;
  const shapes: [ShapeKind, number][] = [
    ['circle', COLORS.green],
    ['triangle', COLORS.red],
    ['square', COLORS.primary],
    ['pentagon', COLORS.pink],
    ['hexagon', COLORS.yellow],
    ['diamond', COLORS.cyan],
  ];
  shapes.forEach(([kind, color], i) => {
    const s = scene.add.graphics().setDepth(-9).setAlpha(0.13);
    drawShape(s, kind, 0, 0, rng.between(26, 46), color);
    s.setPosition(rng.between(60, GAME_WIDTH - 60), rng.between(60, GAME_HEIGHT - 60));
    scene.tweens.add({
      targets: s,
      x: s.x + rng.between(-80, 80),
      y: s.y + rng.between(-60, 60),
      angle: rng.between(-40, 40),
      duration: 6000 + i * 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  });
};
