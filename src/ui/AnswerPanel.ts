import Phaser from 'phaser';
import { formatNumber, notation, t } from '../i18n/i18n';
import { format } from '../math/expr';
import type { Problem } from '../math/types';
import type { AnswerOutcome } from '../game/Quiz';
import { Button } from './Button';
import { NumPad } from './NumPad';
import { COLORS, fitText, GAME_HEIGHT, shade, textStyle } from './theme';

export const PANEL_X = 900;
export const PANEL_Y = 60;
export const PANEL_W = 380;
export const PANEL_H = GAME_HEIGHT - PANEL_Y;
const CX = PANEL_X + PANEL_W / 2;

export interface AnswerPanelHandlers {
  onDigit: (digit: number) => void;
  onBackspace: () => void;
  onToggleSign: () => void;
  onSubmit: () => void;
  onChoose: (index: number) => void;
}

export type InputMode = 'numpad' | 'keyboard' | 'choice';

/** Right-hand panel: the problem, the typed answer or choices, the timer and feedback. */
export class AnswerPanel extends Phaser.GameObjects.Container {
  private readonly card: Phaser.GameObjects.Graphics;
  private readonly problemText: Phaser.GameObjects.Text;
  private readonly answerBox: Phaser.GameObjects.Graphics;
  private readonly answerText: Phaser.GameObjects.Text;
  private readonly caret: Phaser.GameObjects.Rectangle;
  private readonly timerBar: Phaser.GameObjects.Graphics;
  private readonly feedback: Phaser.GameObjects.Text;
  private readonly practiceBadge: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private numpad?: NumPad;
  private okButton?: Button;
  private choiceButtons: Button[] = [];
  private mode: InputMode = 'keyboard';
  private problem?: Problem;
  private choices: number[] | null = null;
  private showingOutcome = false;

  constructor(
    scene: Phaser.Scene,
    private readonly handlers: AnswerPanelHandlers,
  ) {
    super(scene, 0, 0);
    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.bgLight, 1);
    bg.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    bg.fillStyle(COLORS.panelBorder, 1);
    bg.fillRect(PANEL_X, PANEL_Y, 4, PANEL_H);

    this.card = scene.add.graphics();
    this.problemText = scene.add.text(CX, 150, '', textStyle(60, COLORS.text, '700')).setOrigin(0.5);
    this.practiceBadge = scene.add
      .text(CX, 88, t('hud.practice'), textStyle(18, COLORS.purple, '700'))
      .setOrigin(0.5)
      .setVisible(false);
    this.timerBar = scene.add.graphics();
    this.answerBox = scene.add.graphics();
    this.answerText = scene.add.text(CX, 262, '', textStyle(50, COLORS.text, '700')).setOrigin(0.5);
    this.caret = scene.add.rectangle(CX, 262, 4, 44, COLORS.primary);
    scene.tweens.add({ targets: this.caret, alpha: 0, duration: 450, yoyo: true, repeat: -1 });
    this.feedback = scene.add
      .text(CX, 322, '', textStyle(24, COLORS.text, '700', { align: 'center', wordWrap: { width: PANEL_W - 30 } }))
      .setOrigin(0.5);
    this.hint = scene.add
      .text(CX, 400, t('hud.type'), textStyle(20, COLORS.textDim, '500', { align: 'center' }))
      .setOrigin(0.5);

    this.add([bg, this.card, this.practiceBadge, this.problemText, this.timerBar, this.answerBox, this.answerText, this.caret, this.feedback, this.hint]);
    this.drawCard(COLORS.panel, COLORS.panelBorder);
    this.drawAnswerBox(COLORS.panelBorder);
    this.setDepth(50);
    scene.add.existing(this);
  }

  private drawCard(fill: number, border: number): void {
    this.card.clear();
    this.card.fillStyle(fill, 1);
    this.card.fillRoundedRect(PANEL_X + 18, 76, PANEL_W - 36, 136, 20);
    this.card.lineStyle(4, border, 1);
    this.card.strokeRoundedRect(PANEL_X + 18, 76, PANEL_W - 36, 136, 20);
  }

  private drawAnswerBox(border: number): void {
    this.answerBox.clear();
    if (this.mode === 'choice') return;
    this.answerBox.fillStyle(COLORS.bg, 1);
    this.answerBox.fillRoundedRect(CX - 130, 226, 260, 72, 16);
    this.answerBox.lineStyle(4, border, 1);
    this.answerBox.strokeRoundedRect(CX - 130, 226, 260, 72, 16);
  }

  setPractice(on: boolean): void {
    this.practiceBadge.setVisible(on);
  }

  /** Switch between on-screen number pad, physical keyboard only, and multiple choice. */
  setMode(mode: InputMode): void {
    this.mode = mode;
    this.numpad?.destroy();
    this.numpad = undefined;
    this.okButton?.destroy();
    this.okButton = undefined;
    this.choiceButtons.forEach((b) => b.destroy());
    this.choiceButtons = [];

    const typing = mode !== 'choice';
    this.answerText.setVisible(typing);
    this.caret.setVisible(false);
    this.hint.setVisible(mode === 'keyboard');
    this.feedback.setY(typing ? 322 : 262);
    this.drawAnswerBox(COLORS.panelBorder);

    if (mode === 'numpad') {
      this.numpad = new NumPad(this.scene, CX, 520, PANEL_W - 50, 330, {
        onDigit: this.handlers.onDigit,
        onBackspace: this.handlers.onBackspace,
        onToggleSign: this.handlers.onToggleSign,
        onSubmit: this.handlers.onSubmit,
      });
      this.add(this.numpad);
    } else if (mode === 'keyboard') {
      this.okButton = new Button(this.scene, CX, 470, {
        width: 220,
        height: 76,
        icon: 'check',
        label: 'OK',
        color: COLORS.green,
        onClick: this.handlers.onSubmit,
      });
      this.add(this.okButton);
    } else {
      const bw = (PANEL_W - 50 - 14) / 2;
      const bh = 150;
      for (let i = 0; i < 4; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const b = new Button(this.scene, CX - bw / 2 - 7 + col * (bw + 14), 330 + bh / 2 + row * (bh + 14), {
          width: bw,
          height: bh,
          label: '',
          fontSize: 44,
          color: [COLORS.primary, COLORS.pink, COLORS.orange, COLORS.cyan][i],
          onClick: () => this.handlers.onChoose(i),
        });
        const keyHint = this.scene.add.text(-bw / 2 + 16, -bh / 2 + 12, String(i + 1), textStyle(18, COLORS.text, '600')).setAlpha(0.6);
        b.add(keyHint);
        this.choiceButtons.push(b);
        this.add(b);
      }
    }
    if (this.problem) this.showProblem(this.problem, this.choices, true);
  }

  get inputMode(): InputMode {
    return this.mode;
  }

  showProblem(problem: Problem, choices: number[] | null, allowNegative: boolean): void {
    this.problem = problem;
    this.choices = choices;
    this.problemText.setText(`${format(problem.expr, notation())} =`);
    fitText(this.problemText, PANEL_W - 70, 60, 26);
    this.problemText.setColor('#ffffff');
    this.drawCard(COLORS.panel, COLORS.panelBorder);
    this.drawAnswerBox(COLORS.panelBorder);
    this.showingOutcome = false;
    this.feedback.setText('');
    this.setInput('');
    this.numpad?.setSignEnabled(allowNegative);
    this.numpad?.setInputEnabled(true);
    this.okButton?.setEnabled(true);
    if (choices) {
      this.choiceButtons.forEach((b, i) => {
        b.setLabel(formatNumber(choices[i]));
        b.setEnabled(true).setAlpha(1).setScale(1);
      });
    }
    this.scene.tweens.add({ targets: this.problemText, scale: { from: 0.7, to: 1 }, duration: 220, ease: 'Back.easeOut' });
  }

  setInput(value: string): void {
    const shown = value.startsWith('-') ? `−${value.slice(1)}` : value;
    this.answerText.setText(shown || '?');
    this.answerText.setColor(shown ? '#ffffff' : '#4a5280');
    this.caret.setX(shown ? CX + this.answerText.width / 2 + 6 : CX + 22);
  }

  setTimer(fraction: number | null): void {
    const g = this.timerBar;
    g.clear();
    if (fraction === null) return;
    const w = PANEL_W - 76;
    const x = PANEL_X + 38;
    const y = 198;
    g.fillStyle(COLORS.bg, 1);
    g.fillRoundedRect(x, y, w, 8, 4);
    const color = fraction > 0.5 ? COLORS.green : fraction > 0.25 ? COLORS.yellow : COLORS.red;
    g.fillStyle(color, 1);
    if (fraction > 0) g.fillRoundedRect(x, y, Math.max(8, w * fraction), 8, 4);
  }

  /** Show whether the answer was right; wrong answers reveal the correct one. */
  showOutcome(outcome: AnswerOutcome, chosenIndex: number | null): void {
    this.showingOutcome = true;
    this.numpad?.setInputEnabled(false);
    this.okButton?.setEnabled(false);
    const answer = formatNumber(outcome.problem.answer);
    if (outcome.result === 'correct') {
      this.drawCard(shade(COLORS.green, -0.55), COLORS.green);
      this.drawAnswerBox(COLORS.green);
      this.feedback.setText(t('hud.correct')).setColor('#3ddc84');
      this.scene.tweens.add({ targets: this.feedback, scale: { from: 1.4, to: 1 }, duration: 250, ease: 'Back.easeOut' });
    } else {
      this.drawCard(shade(COLORS.red, -0.6), COLORS.red);
      this.drawAnswerBox(COLORS.red);
      this.feedback
        .setText(outcome.result === 'timeout' ? t('hud.timeout', { answer }) : t('hud.wrong', { answer }))
        .setColor('#ffd60a');
      this.scene.tweens.add({ targets: this.card, x: { from: -8, to: 0 }, duration: 300, ease: 'Elastic.easeOut' });
      if (this.mode !== 'choice') this.answerText.setText(answer).setColor('#ffd60a');
    }
    if (this.choices) {
      this.choiceButtons.forEach((b, i) => {
        const isAnswer = this.choices![i] === outcome.problem.answer;
        b.setEnabled(false);
        if (isAnswer) {
          b.setAlpha(1).setColor(COLORS.green);
          this.scene.tweens.add({ targets: b, scale: { from: 1.08, to: 1 }, duration: 300 });
        } else if (i === chosenIndex) {
          b.setAlpha(1).setColor(COLORS.red);
        } else {
          b.setAlpha(0.3);
        }
      });
    }
    this.caret.setVisible(false);
  }

  /** Restore colours after feedback (before the next problem). */
  resetChoiceColors(): void {
    const colors = [COLORS.primary, COLORS.pink, COLORS.orange, COLORS.cyan];
    this.choiceButtons.forEach((b, i) => b.setColor(colors[i]));
  }

  /**
   * Whether an answer can be given right now. The blinking cursor only shows then, and only when
   * typing on a physical keyboard; the answer buttons are dimmed otherwise.
   */
  setAccepting(on: boolean): void {
    this.caret.setVisible(on && this.mode === 'keyboard');
    this.hint.setVisible(on && this.mode === 'keyboard');
    if (this.showingOutcome) return;
    if (this.okButton && this.okButton.isEnabled !== on) this.okButton.setEnabled(on);
    this.numpad?.setInputEnabled(on);
    this.choiceButtons.forEach((b) => {
      if (b.isEnabled !== on) b.setEnabled(on);
    });
  }

  /** Big flashy text over the panel. */
  flash(text: string, color: number): void {
    const label = this.scene.add
      .text(CX, 150, text, textStyle(40, color, '700', { stroke: '#0b1026', strokeThickness: 8 }))
      .setOrigin(0.5)
      .setDepth(60);
    this.scene.tweens.add({
      targets: label,
      scale: { from: 0.4, to: 1.2 },
      alpha: { from: 1, to: 0 },
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  /** Where the problem card is (for the tutorial highlight). */
  get problemBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(PANEL_X + 18, 76, PANEL_W - 36, 230);
  }

  refreshTexts(): void {
    this.practiceBadge.setText(t('hud.practice'));
    this.hint.setText(t('hud.type'));
    if (this.problem) {
      this.problemText.setText(`${format(this.problem.expr, notation())} =`);
      fitText(this.problemText, PANEL_W - 70, 60, 26);
    }
  }
}
