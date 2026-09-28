import type Phaser from 'phaser';
import type { Avatar } from '../profiles/profile';
import { drawShape } from './shapes';
import { shade } from './theme';

/** Draw a player's avatar: their shape and colour with a friendly face. */
export const drawAvatar = (g: Phaser.GameObjects.Graphics, avatar: Avatar, radius: number, x = 0, y = 0): void => {
  drawShape(g, avatar.shape, x, y, radius, avatar.color, shade(avatar.color, -0.4), Math.max(2, radius / 12));
  const eyeR = radius * 0.2;
  const spread = radius * 0.33;
  const ey = y - radius * 0.1;
  for (const side of [-1, 1]) {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x + side * spread, ey, eyeR);
    g.fillStyle(0x111111, 1);
    g.fillCircle(x + side * spread, ey + eyeR * 0.2, eyeR * 0.5);
  }
  g.lineStyle(Math.max(2, radius / 14), 0x111111, 1);
  g.beginPath();
  g.arc(x, y + radius * 0.15, radius * 0.28, 0.2 * Math.PI, 0.8 * Math.PI);
  g.strokePath();
};
