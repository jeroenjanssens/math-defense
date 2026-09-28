import { categoryOf, parseKey } from '../math/expr';
import type { FactCategory } from '../math/types';

/** Statistics for a single fact, e.g. `7*8`. Short names keep localStorage small. */
export interface FactStat {
  /** Times asked. */
  n: number;
  /** Correct answers. */
  c: number;
  /** Wrong answers. */
  w: number;
  /** Timeouts. */
  t: number;
  /** Total answer time in ms over correct answers. */
  ms: number;
  /** Last seen (timestamp). */
  last: number;
  /** Leitner box, 0 (needs practice) to 4 (well known). */
  box: number;
}

export interface SessionRecord {
  date: number;
  durationMs: number;
  asked: number;
  correct: number;
  wrong: number;
  timeouts: number;
  wave: number;
  won: boolean;
  score: number;
  bestStreak: number;
}

export interface Progress {
  facts: Record<string, FactStat>;
  sessions: SessionRecord[];
}

export type AnswerResult = 'correct' | 'wrong' | 'timeout';

export const MAX_SESSIONS = 50;
/** A correct answer slower than this doesn't move the fact up a box. */
export const SLOW_ANSWER_MS = 8000;

export const emptyProgress = (): Progress => ({ facts: {}, sessions: [] });

export const recordAnswer = (
  progress: Progress,
  key: string,
  result: AnswerResult,
  answerMs: number,
  now = Date.now(),
): FactStat => {
  const stat = (progress.facts[key] ??= { n: 0, c: 0, w: 0, t: 0, ms: 0, last: 0, box: 1 });
  stat.n++;
  stat.last = now;
  if (result === 'correct') {
    stat.c++;
    stat.ms += answerMs;
    if (answerMs < SLOW_ANSWER_MS) stat.box = Math.min(4, stat.box + 1);
  } else {
    if (result === 'wrong') stat.w++;
    else stat.t++;
    stat.box = 0;
  }
  return stat;
};

export const recordSession = (progress: Progress, session: SessionRecord): void => {
  progress.sessions.push(session);
  if (progress.sessions.length > MAX_SESSIONS) progress.sessions.splice(0, progress.sessions.length - MAX_SESSIONS);
};

const BOX_WEIGHTS = [8, 5, 3, 1.5, 1];
const UNSEEN_WEIGHT = 3;

/** Weight for adaptive practice: facts in lower boxes come back more often. */
export const practiceWeight = (progress: Progress, key: string): number => {
  const stat = progress.facts[key];
  return stat ? BOX_WEIGHTS[stat.box] ?? 1 : UNSEEN_WEIGHT;
};

export type Mastery = 'none' | 'bad' | 'ok' | 'good';

export const accuracy = (stat: FactStat): number => (stat.n === 0 ? 0 : stat.c / stat.n);

export const mastery = (stat: FactStat | undefined): Mastery => {
  if (!stat || stat.n === 0) return 'none';
  if (stat.box >= 3 && accuracy(stat) >= 0.8) return 'good';
  if (stat.box === 0 || accuracy(stat) < 0.6) return 'bad';
  return 'ok';
};

/** How much a fact needs practice; higher is weaker. */
const weakness = (stat: FactStat): number => (stat.w + stat.t * 1.2) / stat.n + (4 - stat.box) * 0.15;

/** The weakest facts that were answered wrong at least once and aren't mastered yet. */
export const weakestFacts = (progress: Progress, limit = 8): string[] =>
  Object.entries(progress.facts)
    .filter(([, s]) => s.w + s.t > 0 && mastery(s) !== 'good')
    .sort(([, a], [, b]) => weakness(b) - weakness(a) || b.last - a.last)
    .slice(0, limit)
    .map(([key]) => key);

export interface CategorySummary {
  asked: number;
  correct: number;
}

export const categorySummary = (progress: Progress): Record<FactCategory, CategorySummary> => {
  const summary: Record<FactCategory, CategorySummary> = {
    multiplication: { asked: 0, correct: 0 },
    addition: { asked: 0, correct: 0 },
    subtraction: { asked: 0, correct: 0 },
    division: { asked: 0, correct: 0 },
    mixed: { asked: 0, correct: 0 },
  };
  for (const [key, stat] of Object.entries(progress.facts)) {
    let category: FactCategory;
    try {
      category = categoryOf(parseKey(key));
    } catch {
      continue;
    }
    summary[category].asked += stat.n;
    summary[category].correct += stat.c;
  }
  return summary;
};

export const totals = (progress: Progress): CategorySummary =>
  Object.values(progress.facts).reduce(
    (acc, s) => ({ asked: acc.asked + s.n, correct: acc.correct + s.c }),
    { asked: 0, correct: 0 },
  );
