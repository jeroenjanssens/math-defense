import Phaser from 'phaser';
import { FONT, GAME_WIDTH } from './theme';

/**
 * A real HTML text input positioned over the canvas, so tablets show their keyboard.
 * Coordinates are in design units, like the rest of the game.
 */
export class HtmlInput {
  readonly el: HTMLInputElement;
  private readonly onResize = () => this.position();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    options: { value?: string; placeholder?: string; maxLength?: number; onEnter?: () => void } = {},
  ) {
    const el = document.createElement('input');
    el.type = 'text';
    el.value = options.value ?? '';
    el.placeholder = options.placeholder ?? '';
    el.maxLength = options.maxLength ?? 16;
    el.autocomplete = 'off';
    el.spellcheck = false;
    el.setAttribute('autocapitalize', 'words');
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: '5',
      boxSizing: 'border-box',
      border: '4px solid #6c8cff',
      borderRadius: '14px',
      background: '#0b1026',
      color: '#ffffff',
      fontFamily: FONT,
      fontWeight: '600',
      textAlign: 'center',
      outline: 'none',
      padding: '0 12px',
    } satisfies Partial<CSSStyleDeclaration>);
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') options.onEnter?.();
    });
    el.addEventListener('keyup', (e) => e.stopPropagation());
    document.body.append(el);
    this.el = el;
    this.position();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    window.addEventListener('resize', this.onResize);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  get value(): string {
    return this.el.value;
  }

  focus(): void {
    this.el.focus();
  }

  private position(): void {
    const canvas = this.scene.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / GAME_WIDTH;
    Object.assign(this.el.style, {
      left: `${rect.left + (this.x - this.width / 2) * scale}px`,
      top: `${rect.top + (this.y - this.height / 2) * scale}px`,
      width: `${this.width * scale}px`,
      height: `${this.height * scale}px`,
      fontSize: `${Math.round(this.height * 0.5 * scale)}px`,
    });
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    window.removeEventListener('resize', this.onResize);
    this.el.remove();
  }
}
