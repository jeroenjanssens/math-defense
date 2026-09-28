import type Phaser from 'phaser';
import { Button } from './Button';
import { COLORS } from './theme';

/** Whether this browser can go fullscreen (iPhone Safari can't; there, "Add to Home Screen" is the way). */
export const canFullscreen = (scene: Phaser.Scene): boolean => scene.sys.game.device.fullscreen.available;

export const toggleFullscreen = (scene: Phaser.Scene): void => {
  if (!canFullscreen(scene)) return;
  if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
  else scene.scale.startFullscreen();
};

/** Fullscreen toggle; hidden where the browser doesn't support it. */
export const addFullscreenButton = (scene: Phaser.Scene, x: number, y: number, size = 52): Button | null => {
  if (!canFullscreen(scene)) return null;
  return new Button(scene, x, y, {
    width: size,
    height: size,
    icon: 'fullscreen',
    color: COLORS.panelLight,
    onClick: () => toggleFullscreen(scene),
  });
};
