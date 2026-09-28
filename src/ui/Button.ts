import Phaser from 'phaser';
import { playSfx } from '../audio/sfx';
import { drawIcon, type IconName } from './icons';
import { COLORS, fitText, shade, textStyle } from './theme';

export interface ButtonOptions {
  width: number;
  height: number;
  label?: string;
  icon?: IconName;
  iconSize?: number;
  color?: number;
  textColor?: number;
  fontSize?: number;
  radius?: number;
  onClick?: () => void;
  /** Draw only an outline until selected (used by toggles). */
  outline?: boolean;
}

/** A rounded, pressable button with an optional icon. Works the same with mouse and touch. */
export class Button extends Phaser.GameObjects.Container {
  protected readonly bg: Phaser.GameObjects.Graphics;
  protected readonly iconGfx: Phaser.GameObjects.Graphics;
  readonly label: Phaser.GameObjects.Text;
  protected opts: Required<Omit<ButtonOptions, 'icon' | 'label' | 'onClick'>> & ButtonOptions;
  private enabled = true;
  private hovered = false;
  private pressed = false;
  protected highlighted = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    super(scene, x, y);
    this.opts = {
      color: COLORS.primary,
      textColor: COLORS.text,
      fontSize: Math.min(28, Math.round(options.height * 0.42)),
      radius: Math.min(18, options.height / 2),
      iconSize: Math.round(options.height * 0.5),
      outline: false,
      ...(Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined)) as ButtonOptions),
    };
    this.bg = scene.add.graphics();
    this.iconGfx = scene.add.graphics();
    this.label = scene.add.text(0, 0, options.label ?? '', textStyle(this.opts.fontSize, this.opts.textColor)).setOrigin(0.5);
    this.add([this.bg, this.iconGfx, this.label]);
    this.setSize(options.width, options.height);
    this.setInteractive({ useHandCursor: true });
    this.layout();
    this.redraw();

    this.on('pointerover', () => {
      this.hovered = true;
      this.redraw();
    });
    this.on('pointerout', () => {
      this.hovered = false;
      this.pressed = false;
      this.redraw();
      this.setScale(1);
    });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.redraw();
      this.setScale(0.96);
    });
    this.on('pointerup', () => {
      const wasPressed = this.pressed;
      this.pressed = false;
      this.setScale(1);
      this.redraw();
      if (wasPressed && this.enabled) {
        playSfx('click');
        this.opts.onClick?.();
      }
    });
    scene.add.existing(this);
  }

  /** Trigger the click handler as if pressed (used for keyboard shortcuts). */
  click(): void {
    if (!this.enabled) return;
    this.scene.tweens.add({ targets: this, scale: { from: 0.94, to: 1 }, duration: 120 });
    this.opts.onClick?.();
  }

  setOnClick(fn: () => void): this {
    this.opts.onClick = fn;
    return this;
  }

  setLabel(text: string): this {
    this.label.setText(text);
    this.layout();
    return this;
  }

  setColor(color: number): this {
    this.opts.color = color;
    this.redraw();
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.45);
    if (this.input) this.input.cursor = enabled ? 'pointer' : 'default';
    return this;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setHighlighted(on: boolean): this {
    this.highlighted = on;
    this.redraw();
    return this;
  }

  protected layout(): void {
    const { icon, width, iconSize, fontSize } = this.opts;
    this.iconGfx.clear();
    const hasLabel = this.label.text.length > 0;
    if (icon) drawIcon(this.iconGfx, icon, iconSize, this.opts.textColor);
    if (icon && hasLabel) {
      fitText(this.label, width - iconSize - 36, fontSize);
      const total = iconSize + 10 + this.label.width;
      this.iconGfx.setPosition(-total / 2 + iconSize / 2, 0);
      this.label.setPosition(-total / 2 + iconSize + 10 + this.label.width / 2, 0);
    } else {
      this.iconGfx.setPosition(0, 0);
      this.label.setPosition(0, 0);
      if (hasLabel) fitText(this.label, width - 20, fontSize);
    }
  }

  protected redraw(): void {
    const { width: w, height: h, radius, color, outline } = this.opts;
    const g = this.bg;
    g.clear();
    const filled = !outline || this.highlighted;
    const base = filled ? color : COLORS.panel;
    const top = this.pressed ? shade(base, -0.15) : this.hovered && this.enabled ? shade(base, 0.12) : base;
    const lift = this.pressed ? 1 : 4;
    // Shadow / 3D edge
    g.fillStyle(shade(filled ? color : COLORS.panelBorder, -0.45), 1);
    g.fillRoundedRect(-w / 2, -h / 2 + lift, w, h, radius);
    g.fillStyle(top, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + (this.pressed ? 1 : 0), w, h - (this.pressed ? 0 : 1), radius);
    if (!filled) {
      g.lineStyle(3, shade(color, 0.1), 1);
      g.strokeRoundedRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, radius);
    } else {
      g.fillStyle(0xffffff, 0.12);
      g.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, h * 0.4, { tl: radius - 2, tr: radius - 2, bl: 4, br: 4 });
    }
  }
}

/** A button that toggles between selected and not selected. */
export class ToggleButton extends Button {
  private selectedState: boolean;
  private onChange?: (selected: boolean) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: ButtonOptions & { selected?: boolean; onChange?: (selected: boolean) => void },
  ) {
    super(scene, x, y, { ...options, outline: true });
    this.selectedState = options.selected ?? false;
    this.onChange = options.onChange;
    this.setOnClick(() => this.setSelected(!this.selectedState, true));
    this.setHighlighted(this.selectedState);
  }

  get selected(): boolean {
    return this.selectedState;
  }

  setSelected(selected: boolean, notify = false): this {
    this.selectedState = selected;
    this.setHighlighted(selected);
    if (notify) this.onChange?.(selected);
    return this;
  }
}

export interface SegmentOption<T> {
  value: T;
  label: string;
}

/** A row of buttons of which exactly one is selected. */
export class Segmented<T> extends Phaser.GameObjects.Container {
  private buttons: { value: T; button: ToggleButton }[] = [];
  private current: T;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: {
      options: SegmentOption<T>[];
      value: T;
      width: number;
      height: number;
      gap?: number;
      color?: number;
      fontSize?: number;
      onChange?: (value: T) => void;
    },
  ) {
    super(scene, x, y);
    const gap = options.gap ?? 8;
    const count = options.options.length;
    const bw = (options.width - gap * (count - 1)) / count;
    this.current = options.value;
    options.options.forEach((opt, i) => {
      const bx = -options.width / 2 + bw / 2 + i * (bw + gap);
      const button = new ToggleButton(scene, bx, 0, {
        width: bw,
        height: options.height,
        label: opt.label,
        color: options.color,
        fontSize: options.fontSize,
        selected: opt.value === options.value,
      });
      button.setOnClick(() => {
        this.setValue(opt.value);
        options.onChange?.(opt.value);
      });
      this.buttons.push({ value: opt.value, button });
      this.add(button);
    });
    scene.add.existing(this);
  }

  get value(): T {
    return this.current;
  }

  setValue(value: T): this {
    this.current = value;
    this.buttons.forEach(({ value: v, button }) => button.setSelected(v === value));
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.buttons.forEach(({ button }) => button.setEnabled(enabled));
    return this;
  }
}

/** A button that must be held for a while before it fires (parent lock). */
export class HoldButton extends Button {
  private readonly progressGfx: Phaser.GameObjects.Graphics;
  private holdTween?: Phaser.Tweens.Tween;
  private progress = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions & { holdMs?: number }) {
    const onHold = options.onClick;
    super(scene, x, y, { ...options, onClick: undefined });
    const holdMs = options.holdMs ?? 3000;
    this.progressGfx = scene.add.graphics();
    this.addAt(this.progressGfx, 1);

    const cancel = () => {
      this.holdTween?.stop();
      this.holdTween = undefined;
      this.progress = 0;
      this.drawProgress();
    };
    this.on('pointerdown', () => {
      if (!this.isEnabled) return;
      cancel();
      this.holdTween = scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: holdMs,
        onUpdate: (tween) => {
          this.progress = tween.getValue() ?? 0;
          this.drawProgress();
        },
        onComplete: () => {
          this.holdTween = undefined;
          this.progress = 0;
          this.drawProgress();
          onHold?.();
        },
      });
    });
    this.on('pointerup', cancel);
    this.on('pointerout', cancel);
    this.once(Phaser.GameObjects.Events.DESTROY, cancel);
  }

  private drawProgress(): void {
    const { width: w, height: h, radius } = this.opts;
    this.progressGfx.clear();
    if (this.progress <= 0) return;
    this.progressGfx.fillStyle(0xffffff, 0.3);
    this.progressGfx.fillRoundedRect(-w / 2, -h / 2, Math.max(radius * 2, w * this.progress), h, radius);
  }
}
