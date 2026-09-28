import { multipleChoiceOptions } from '../math/distractors';
import type { Rng } from '../math/rng';
import { ProblemSequencer } from '../math/sequencer';
import type { MathSettings, Problem } from '../math/types';
import type { AnswerMode } from '../profiles/profile';
import { practiceWeight, recordAnswer, type AnswerResult, type Progress } from '../profiles/progress';

export interface QuizOptions {
  math: MathSettings;
  answerMode: AnswerMode;
  /** Seconds per problem, or null for no timer. */
  timerSeconds: number | null;
  progress: Progress;
  practiceKeys?: string[];
  rng?: Rng;
}

export interface AnswerOutcome {
  result: AnswerResult;
  problem: Problem;
  given: number | null;
  answerMs: number;
  streak: number;
}

const MAX_INPUT = 6;

/**
 * The math side of the game, independent of Phaser: hands out problems, keeps the typed input,
 * runs the optional timer and records every answer in the player's progress.
 */
export class Quiz {
  private sequencer: ProblemSequencer;
  private options: QuizOptions;
  problem!: Problem;
  choices: number[] | null = null;
  input = '';
  elapsedMs = 0;
  /** While false (e.g. showing feedback), input is ignored and the timer is stopped. */
  accepting = false;

  asked = 0;
  correct = 0;
  wrong = 0;
  timeouts = 0;
  streak = 0;
  bestStreak = 0;
  /** Keys of problems answered wrong (or timed out) this session, most recent last. */
  readonly mistakes: string[] = [];

  constructor(options: QuizOptions) {
    this.options = options;
    this.sequencer = new ProblemSequencer(options.math, {
      rng: options.rng,
      practiceKeys: options.practiceKeys,
      weightOf: (key) => practiceWeight(this.options.progress, key),
    });
  }

  get answerMode(): AnswerMode {
    return this.options.answerMode;
  }

  get timerSeconds(): number | null {
    return this.options.timerSeconds;
  }

  get isPractice(): boolean {
    return this.sequencer.isPractice;
  }

  get allowsNegative(): boolean {
    return this.options.math.negativeNumbers || this.problem?.answer < 0;
  }

  /** Remaining time as a fraction (1 = full), or null without a timer. */
  get timeLeft(): number | null {
    const seconds = this.options.timerSeconds;
    if (!seconds) return null;
    return Math.max(0, 1 - this.elapsedMs / (seconds * 1000));
  }

  /** Apply new settings (from the settings screen); they take effect from the next problem. */
  updateOptions(changes: Partial<Omit<QuizOptions, 'progress' | 'practiceKeys' | 'rng'>>): void {
    this.options = { ...this.options, ...changes };
    if (changes.math) this.sequencer.updateSettings(changes.math);
  }

  next(): Problem {
    this.problem = this.sequencer.next();
    this.choices = this.options.answerMode === 'choice' ? multipleChoiceOptions(this.problem, this.options.rng) : null;
    this.input = '';
    this.elapsedMs = 0;
    this.accepting = true;
    return this.problem;
  }

  /** Switch between typing and multiple choice for the current problem too. */
  setAnswerMode(mode: AnswerMode): void {
    this.options.answerMode = mode;
    if (this.problem) {
      this.choices = mode === 'choice' ? multipleChoiceOptions(this.problem, this.options.rng) : null;
    }
  }

  typeDigit(digit: number): void {
    if (!this.accepting || this.choices) return;
    const digits = this.input.replace('-', '');
    if (digits.length >= MAX_INPUT) return;
    if (digits === '0') this.input = this.input.replace('0', '');
    this.input += String(digit);
  }

  backspace(): void {
    if (!this.accepting || this.choices) return;
    this.input = this.input.slice(0, -1);
  }

  toggleSign(): void {
    if (!this.accepting || this.choices || !this.allowsNegative) return;
    this.input = this.input.startsWith('-') ? this.input.slice(1) : `-${this.input}`;
  }

  /** Submit the typed answer; returns null when there is nothing (valid) to submit. */
  submit(): AnswerOutcome | null {
    if (!this.accepting || this.choices) return null;
    if (!/^-?\d+$/.test(this.input)) return null;
    return this.resolve(Number(this.input));
  }

  choose(index: number): AnswerOutcome | null {
    if (!this.accepting || !this.choices || index < 0 || index >= this.choices.length) return null;
    return this.resolve(this.choices[index]);
  }

  /** Advance the timer; returns an outcome when time ran out. */
  tick(deltaMs: number): AnswerOutcome | null {
    if (!this.accepting) return null;
    this.elapsedMs += deltaMs;
    const seconds = this.options.timerSeconds;
    if (seconds && this.elapsedMs >= seconds * 1000) return this.finish('timeout', null);
    return null;
  }

  private resolve(given: number): AnswerOutcome {
    return this.finish(given === this.problem.answer ? 'correct' : 'wrong', given);
  }

  private finish(result: AnswerResult, given: number | null): AnswerOutcome {
    this.accepting = false;
    this.asked++;
    if (result === 'correct') {
      this.correct++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
    } else {
      if (result === 'wrong') this.wrong++;
      else this.timeouts++;
      this.streak = 0;
      const i = this.mistakes.indexOf(this.problem.key);
      if (i >= 0) this.mistakes.splice(i, 1);
      this.mistakes.push(this.problem.key);
    }
    recordAnswer(this.options.progress, this.problem.key, result, this.elapsedMs);
    return { result, problem: this.problem, given, answerMs: this.elapsedMs, streak: this.streak };
  }
}
