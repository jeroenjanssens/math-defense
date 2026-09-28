import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import Phaser from 'phaser';
import { initRotatePrompt } from './rotatePrompt';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { ProfileScene } from './scenes/ProfileScene';
import { ProgressScene } from './scenes/ProgressScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GAME_ELEMENT_ID } from './ui/dom';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from './ui/theme';

const loadFonts = async (): Promise<void> => {
  try {
    await Promise.all(['400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 32px "Fredoka"`)));
  } catch {
    // Fall back to system fonts.
  }
};

const start = async (): Promise<void> => {
  await loadFonts();
  initRotatePrompt();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: GAME_ELEMENT_ID,
    backgroundColor: COLORS.bg,
    antialias: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH * RENDER_SCALE,
      height: GAME_HEIGHT * RENDER_SCALE,
      fullscreenTarget: GAME_ELEMENT_ID,
    },
    input: { activePointers: 3 },
    scene: [
      BootScene,
      ProfileScene,
      MenuScene,
      SettingsScene,
      ProgressScene,
      GameScene,
      PauseScene,
      GameOverScene,
    ],
  });
  // Handy for debugging and automated checks during development.
  if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
};

void start();
