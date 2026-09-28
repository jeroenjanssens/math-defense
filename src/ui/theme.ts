import type Phaser from 'phaser';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/**
 * The canvas renders at a multiple of the design size on high-DPI screens so text and shapes stay
 * crisp. All game code uses design coordinates; each scene's camera zooms by this factor.
 */
export const RENDER_SCALE =
  typeof window !== 'undefined' && (window.devicePixelRatio ?? 1) >= 1.5 ? 2 : 1;

/** Make a scene's camera map design coordinates onto the (possibly larger) canvas. */
export const setupCamera = (scene: Phaser.Scene): void => {
  scene.cameras.main.setOrigin(0, 0).setZoom(RENDER_SCALE);
};

export const FONT = '"Fredoka", "Trebuchet MS", "Arial Rounded MT Bold", sans-serif';

export const COLORS = {
  bg: 0x0b1026,
  bgLight: 0x151c3f,
  panel: 0x1c2452,
  panelLight: 0x28336e,
  panelBorder: 0x3b4a9a,
  text: 0xffffff,
  textDim: 0xaab4e8,
  primary: 0x6c8cff,
  green: 0x3ddc84,
  red: 0xff4d6d,
  orange: 0xff9f1c,
  yellow: 0xffd60a,
  cyan: 0x22d3ee,
  purple: 0xc77dff,
  pink: 0xff70c8,
  grey: 0x4a5280,
  path: 0x26306a,
  pathEdge: 0x3a4690,
  grass: 0x101838,
} as const;

export const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

export type TextWeight = '400' | '500' | '600' | '700';

export const textStyle = (
  size: number,
  color: number = COLORS.text,
  weight: TextWeight = '600',
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  fontStyle: weight,
  color: hex(color),
  resolution: RENDER_SCALE,
  ...extra,
});

/** Shrink a text object until it fits within the given width. */
export const fitText = (text: Phaser.GameObjects.Text, maxWidth: number, maxSize: number, minSize = 14): void => {
  let size = maxSize;
  text.setFontSize(size);
  while (text.width > maxWidth && size > minSize) {
    size -= 2;
    text.setFontSize(size);
  }
};

/** Lighten (amount > 0) or darken (amount < 0) a colour. */
export const shade = (color: number, amount: number): number => {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))));
  return (f(r) << 16) | (f(g) << 8) | f(b);
};

export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
