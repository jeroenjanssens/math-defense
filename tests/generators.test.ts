import { describe, expect, it } from 'vitest';
import { evaluate, hasGroupingBrackets, isClean, operatorCount } from '../src/math/expr';
import {
  canUseInOrder,
  inOrderSequence,
  isValidSelection,
  randomProblem,
  RANGE,
  selectedTables,
} from '../src/math/generators';
import { seededRng } from '../src/math/rng';
import { defaultMathSettings, type MathSettings } from '../src/math/types';

const settings = (overrides: Partial<MathSettings>): MathSettings => ({ ...defaultMathSettings(), ...overrides });

const sample = (s: MathSettings, n = 2000, seed = 42) => {
  const rng = seededRng(seed);
  return Array.from({ length: n }, () => randomProblem(rng, s));
};

describe('table selection', () => {
  it('combines grouped and custom tables', () => {
    expect(selectedTables(settings({ categories: ['tables11to12'] }))).toEqual([11, 12]);
    expect(selectedTables(settings({ categories: ['tables1to5', 'customTables'], customTables: [7, 3] }))).toEqual([
      1, 2, 3, 4, 5, 7,
    ]);
  });

  it('requires at least one usable category', () => {
    expect(isValidSelection(settings({ categories: [] }))).toBe(false);
    expect(isValidSelection(settings({ categories: ['customTables'], customTables: [] }))).toBe(false);
    expect(isValidSelection(settings({ categories: ['addition'] }))).toBe(true);
  });
});

describe('random problems', () => {
  it('multiplication stays within the selected tables', () => {
    for (const p of sample(settings({ categories: ['tables6to10'] }))) {
      expect(p.category).toBe('multiplication');
      if (p.expr.kind !== 'op' || p.expr.left.kind !== 'num' || p.expr.right.kind !== 'num') throw new Error();
      const [a, b] = [p.expr.left.value, p.expr.right.value];
      expect([a, b].some((v) => v >= 6 && v <= 10)).toBe(true);
      expect(Math.max(a, b)).toBeLessThanOrEqual(12);
      expect(p.answer).toBe(a * b);
    }
  });

  it('division always has a whole-number answer', () => {
    for (const s of [settings({ categories: ['division'] }), settings({ categories: ['division', 'tables11to12'], numberSize: 'large' })]) {
      const divisions = sample(s).filter((p) => p.category === 'division');
      expect(divisions.length).toBeGreaterThan(500);
      for (const p of divisions) {
        expect(Number.isInteger(p.answer)).toBe(true);
        expect(p.answer).toBeGreaterThan(0);
      }
    }
  });

  it('subtraction is never negative unless negative numbers are enabled', () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      for (const p of sample(settings({ categories: ['subtraction'], numberSize: size }))) {
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.answer).toBeLessThanOrEqual(RANGE[size]);
      }
    }
    const negatives = sample(settings({ categories: ['subtraction'], negativeNumbers: true }));
    expect(negatives.some((p) => p.answer < 0)).toBe(true);
  });

  it('addition respects the number size', () => {
    for (const p of sample(settings({ categories: ['addition'], numberSize: 'small' }))) {
      expect(p.answer).toBeLessThanOrEqual(20);
      expect(p.answer).toBeGreaterThanOrEqual(0);
    }
    const large = sample(settings({ categories: ['addition'], numberSize: 'large' }));
    expect(large.some((p) => p.answer > 100)).toBe(true);
  });

  it('large numbers include 2-digit × 1-digit multiplication', () => {
    const large = sample(settings({ categories: ['tables1to5'], numberSize: 'large' }));
    expect(large.some((p) => p.answer > 144)).toBe(true);
  });

  it('mixed operations are clean and respect the bracket setting', () => {
    const cats: MathSettings['categories'] = ['tables1to5', 'addition', 'subtraction', 'division'];
    const noBrackets = sample(settings({ categories: cats, mixedOperations: true }));
    const mixed = noBrackets.filter((p) => p.category === 'mixed');
    expect(mixed.length).toBeGreaterThan(500);
    for (const p of mixed) {
      expect(operatorCount(p.expr)).toBe(2);
      expect(isClean(p.expr, false)).toBe(true);
      expect(hasGroupingBrackets(p.expr)).toBe(false);
      expect(p.answer).toBe(evaluate(p.expr));
    }
    const withBrackets = sample(settings({ categories: cats, mixedOperations: true, brackets: true }));
    expect(withBrackets.some((p) => hasGroupingBrackets(p.expr))).toBe(true);
  });

  it('mixed operations only use enabled operators', () => {
    for (const p of sample(settings({ categories: ['addition', 'tables1to5'], mixedOperations: true }))) {
      expect(p.key).not.toMatch(/[/]/);
      expect(p.key).not.toMatch(/\d-\d/);
    }
  });
});

describe('in order', () => {
  it('is only available for tables', () => {
    expect(canUseInOrder(settings({ categories: ['tables1to5'] }))).toBe(true);
    expect(canUseInOrder(settings({ categories: ['tables1to5', 'addition'] }))).toBe(false);
    expect(canUseInOrder(settings({ categories: ['tables1to5'], mixedOperations: true }))).toBe(false);
  });

  it('goes 1 × t up to 12 × t for each table', () => {
    const seq = inOrderSequence(settings({ categories: ['customTables'], customTables: [4, 3] }));
    expect(seq.map((p) => p.key).slice(0, 13)).toEqual([
      '1*3', '2*3', '3*3', '4*3', '5*3', '6*3', '7*3', '8*3', '9*3', '10*3', '11*3', '12*3', '1*4',
    ]);
    expect(seq).toHaveLength(24);
  });
});
