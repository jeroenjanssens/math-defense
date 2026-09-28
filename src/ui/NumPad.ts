import Phaser from 'phaser';
import { Button } from './Button';
import { COLORS } from './theme';

export interface NumPadHandlers {
  onDigit: (digit: number) => void;
  onBackspace: () => void;
  onToggleSign: () => void;
  onSubmit: () => void;
}

/** On-screen number pad for tablets: 0-9, ±, backspace and a big OK button. */
export class NumPad extends Phaser.GameObjects.Container {
  private readonly signButton: Button;
  private readonly submitButton: Button;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, handlers: NumPadHandlers) {
    super(scene, x, y);
    const gap = 8;
    const cols = 3;
    const rows = 5;
    const bw = (width - gap * (cols - 1)) / cols;
    const bh = (height - gap * (rows - 1)) / rows;
    const cell = (col: number, row: number) => ({
      x: -width / 2 + bw / 2 + col * (bw + gap),
      y: -height / 2 + bh / 2 + row * (bh + gap),
    });

    const layout = [
      [7, 8, 9],
      [4, 5, 6],
      [1, 2, 3],
    ];
    layout.forEach((row, r) =>
      row.forEach((digit, c) => {
        const p = cell(c, r);
        this.add(this.digitButton(scene, p.x, p.y, bw, bh, digit, handlers));
      }),
    );
    let p = cell(0, 3);
    this.signButton = new Button(scene, p.x, p.y, {
      width: bw,
      height: bh,
      icon: 'plusminus',
      color: COLORS.panelLight,
      onClick: handlers.onToggleSign,
    });
    p = cell(1, 3);
    this.add(this.digitButton(scene, p.x, p.y, bw, bh, 0, handlers));
    p = cell(2, 3);
    const back = new Button(scene, p.x, p.y, {
      width: bw,
      height: bh,
      icon: 'backspace',
      color: COLORS.orange,
      onClick: handlers.onBackspace,
    });
    this.submitButton = new Button(scene, 0, cell(0, 4).y, {
      width,
      height: bh,
      icon: 'check',
      color: COLORS.green,
      onClick: handlers.onSubmit,
    });
    this.add([this.signButton, back, this.submitButton]);
    scene.add.existing(this);
  }

  private digitButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, digit: number, handlers: NumPadHandlers) {
    return new Button(scene, x, y, {
      width: w,
      height: h,
      label: String(digit),
      fontSize: 34,
      color: COLORS.panelLight,
      onClick: () => handlers.onDigit(digit),
    });
  }

  setSignEnabled(enabled: boolean): this {
    this.signButton.setEnabled(enabled);
    return this;
  }

  setInputEnabled(enabled: boolean): this {
    this.submitButton.setEnabled(enabled);
    return this;
  }
}
