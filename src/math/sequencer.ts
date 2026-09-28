import { makeProblem, parseKey } from './expr';
import { canUseInOrder, inOrderSequence, randomProblem } from './generators';
import { shuffle, weightedPick, type Rng } from './rng';
import type { MathSettings, Problem } from './types';

/** Returns how much a fact needs practice (higher = show more often). */
export type WeightFn = (key: string) => number;

export interface SequencerOptions {
  rng?: Rng;
  /** Used for adaptive practice; without it all facts are equally likely. */
  weightOf?: WeightFn;
  /** Practise exactly these facts (canonical keys), e.g. from the "needs practice" list. */
  practiceKeys?: string[];
}

const CANDIDATES = 6;

/** Hands out problems one at a time: random, in order, adaptive, or from a practice list. */
export class ProblemSequencer {
  private settings: MathSettings;
  private readonly rng: Rng;
  private readonly weightOf?: WeightFn;
  private practice: Problem[] = [];
  private practiceQueue: Problem[] = [];
  private ordered: Problem[] = [];
  private orderIndex = 0;
  private lastKey = '';

  constructor(settings: MathSettings, options: SequencerOptions = {}) {
    this.rng = options.rng ?? Math.random;
    this.weightOf = options.weightOf;
    this.settings = settings;
    if (options.practiceKeys?.length) {
      this.practice = options.practiceKeys.map((key) => makeProblem(parseKey(key)));
    }
    this.updateSettings(settings);
  }

  get isInOrder(): boolean {
    return this.practice.length === 0 && this.settings.order === 'inOrder' && canUseInOrder(this.settings);
  }

  get isPractice(): boolean {
    return this.practice.length > 0;
  }

  /** Apply new settings; takes effect from the next problem. */
  updateSettings(settings: MathSettings): void {
    const previousOrderKey = this.ordered.map((p) => p.key).join(',');
    this.settings = settings;
    this.ordered = canUseInOrder(settings) ? inOrderSequence(settings) : [];
    // Keep our place in the sequence when the tables didn't change.
    if (this.ordered.map((p) => p.key).join(',') !== previousOrderKey) this.orderIndex = 0;
  }

  next(): Problem {
    const problem = this.pickNext();
    this.lastKey = problem.key;
    return problem;
  }

  private pickNext(): Problem {
    if (this.practice.length > 0) {
      if (this.practiceQueue.length === 0) {
        this.practiceQueue = shuffle(this.rng, this.practice);
        if (this.practiceQueue.length > 1 && this.practiceQueue[0].key === this.lastKey) {
          this.practiceQueue.push(this.practiceQueue.shift()!);
        }
      }
      return this.practiceQueue.shift()!;
    }

    if (this.isInOrder) {
      const problem = this.ordered[this.orderIndex % this.ordered.length];
      this.orderIndex = (this.orderIndex + 1) % this.ordered.length;
      return problem;
    }

    const candidates: Problem[] = [];
    for (let i = 0; i < CANDIDATES * 3 && candidates.length < CANDIDATES; i++) {
      const p = randomProblem(this.rng, this.settings);
      if (p.key !== this.lastKey && !candidates.some((c) => c.key === p.key)) candidates.push(p);
    }
    if (candidates.length === 0) return randomProblem(this.rng, this.settings);
    if (!this.settings.adaptive || !this.weightOf) return candidates[0];
    return weightedPick(
      this.rng,
      candidates,
      candidates.map((c) => this.weightOf!(c.key)),
    );
  }
}
