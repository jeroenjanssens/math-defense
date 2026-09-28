import type Phaser from 'phaser';

export type IconName =
  | 'pause'
  | 'play'
  | 'fullscreen'
  | 'restart'
  | 'back'
  | 'gear'
  | 'check'
  | 'backspace'
  | 'plusminus'
  | 'heart'
  | 'coin'
  | 'pencil'
  | 'chart'
  | 'upload'
  | 'download'
  | 'close'
  | 'question';

/** Draw a simple geometric icon centred on (0, 0) with the given size. */
export const drawIcon = (g: Phaser.GameObjects.Graphics, name: IconName, size: number, color: number): void => {
  const s = size / 2;
  const lw = Math.max(2, size / 9);
  g.fillStyle(color, 1);
  g.lineStyle(lw, color, 1);
  switch (name) {
    case 'pause':
      g.fillRoundedRect(-s * 0.6, -s * 0.7, s * 0.4, s * 1.4, 2);
      g.fillRoundedRect(s * 0.2, -s * 0.7, s * 0.4, s * 1.4, 2);
      break;
    case 'play':
      g.fillTriangle(-s * 0.45, -s * 0.7, -s * 0.45, s * 0.7, s * 0.7, 0);
      break;
    case 'fullscreen': {
      const a = s * 0.75;
      const b = s * 0.3;
      for (const [x, y] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        g.beginPath();
        g.moveTo(x * a, y * (a - b));
        g.lineTo(x * a, y * a);
        g.lineTo(x * (a - b), y * a);
        g.strokePath();
      }
      break;
    }
    case 'restart':
      g.beginPath();
      g.arc(0, 0, s * 0.6, -Math.PI * 0.35, Math.PI * 1.35);
      g.strokePath();
      g.fillTriangle(s * 0.25, -s * 0.85, s * 0.8, -s * 0.55, s * 0.25, -s * 0.2);
      break;
    case 'back':
      g.beginPath();
      g.moveTo(s * 0.6, 0);
      g.lineTo(-s * 0.5, 0);
      g.strokePath();
      g.fillTriangle(-s * 0.8, 0, -s * 0.2, -s * 0.55, -s * 0.2, s * 0.55);
      break;
    case 'gear': {
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        g.fillCircle(Math.cos(angle) * s * 0.62, Math.sin(angle) * s * 0.62, s * 0.2);
      }
      g.fillCircle(0, 0, s * 0.55);
      g.fillStyle(0x000000, 0.35);
      g.fillCircle(0, 0, s * 0.22);
      break;
    }
    case 'check':
      g.lineStyle(lw * 1.4, color, 1);
      g.beginPath();
      g.moveTo(-s * 0.6, 0);
      g.lineTo(-s * 0.15, s * 0.5);
      g.lineTo(s * 0.65, -s * 0.5);
      g.strokePath();
      break;
    case 'backspace':
      g.beginPath();
      g.moveTo(-s * 0.85, 0);
      g.lineTo(-s * 0.35, -s * 0.55);
      g.lineTo(s * 0.8, -s * 0.55);
      g.lineTo(s * 0.8, s * 0.55);
      g.lineTo(-s * 0.35, s * 0.55);
      g.closePath();
      g.strokePath();
      g.beginPath();
      g.moveTo(-s * 0.05, -s * 0.25);
      g.lineTo(s * 0.45, s * 0.25);
      g.moveTo(s * 0.45, -s * 0.25);
      g.lineTo(-s * 0.05, s * 0.25);
      g.strokePath();
      break;
    case 'plusminus':
      g.fillRect(-s * 0.6, -s * 0.45, s * 0.7, lw);
      g.fillRect(-s * 0.25 - lw / 2, -s * 0.8, lw, s * 0.7);
      g.fillRect(-s * 0.05, s * 0.35, s * 0.7, lw);
      break;
    case 'heart':
      g.fillCircle(-s * 0.35, -s * 0.2, s * 0.4);
      g.fillCircle(s * 0.35, -s * 0.2, s * 0.4);
      g.fillTriangle(-s * 0.73, -s * 0.05, s * 0.73, -s * 0.05, 0, s * 0.8);
      break;
    case 'coin':
      g.fillCircle(0, 0, s * 0.85);
      g.lineStyle(lw * 0.8, 0x000000, 0.25);
      g.strokeCircle(0, 0, s * 0.55);
      break;
    case 'pencil':
      g.fillPoints(
        [
          { x: -s * 0.75, y: s * 0.75 },
          { x: -s * 0.6, y: s * 0.2 },
          { x: s * 0.35, y: -s * 0.75 },
          { x: s * 0.75, y: -s * 0.35 },
          { x: -s * 0.2, y: s * 0.6 },
        ] as Phaser.Math.Vector2[],
        true,
      );
      break;
    case 'chart':
      g.fillRect(-s * 0.7, s * 0.1, s * 0.35, s * 0.6);
      g.fillRect(-s * 0.17, -s * 0.3, s * 0.35, s * 1.0);
      g.fillRect(s * 0.36, -s * 0.7, s * 0.35, s * 1.4);
      break;
    case 'download':
      g.fillRect(-lw / 2, -s * 0.7, lw, s * 0.9);
      g.fillTriangle(-s * 0.4, s * 0.1, s * 0.4, s * 0.1, 0, s * 0.5);
      g.fillRect(-s * 0.7, s * 0.65, s * 1.4, lw);
      break;
    case 'upload':
      g.fillRect(-lw / 2, -s * 0.3, lw, s * 0.9);
      g.fillTriangle(-s * 0.4, -s * 0.2, s * 0.4, -s * 0.2, 0, -s * 0.7);
      g.fillRect(-s * 0.7, s * 0.65, s * 1.4, lw);
      break;
    case 'close':
      g.lineStyle(lw * 1.3, color, 1);
      g.beginPath();
      g.moveTo(-s * 0.5, -s * 0.5);
      g.lineTo(s * 0.5, s * 0.5);
      g.moveTo(s * 0.5, -s * 0.5);
      g.lineTo(-s * 0.5, s * 0.5);
      g.strokePath();
      break;
    case 'question':
      g.beginPath();
      g.arc(0, -s * 0.3, s * 0.38, Math.PI, Math.PI * 2.4);
      g.strokePath();
      g.fillRect(-lw / 2, -s * 0.05, lw, s * 0.35);
      g.fillCircle(0, s * 0.62, lw * 0.8);
      break;
  }
};
