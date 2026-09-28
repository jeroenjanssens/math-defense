import { describe, expect, it } from 'vitest';
import { multipleChoiceOptions } from '../src/math/distractors';
import { makeProblem, num, op, parseKey } from '../src/math/expr';
import { randomProblem } from '../src/math/generators';
import { seededRng } from '../src/math/rng';
import { ProblemSequencer } from '../src/math/sequencer';
import { defaultMathSettings, type MathSettings } from '../src/math/types';

const settings = (overrides: Partial<MathSettings>): MathSettings => ({ ...defaultMathSettings(), ...overrides });

describe('sequencer', () => {
  it('cycles through the tables in order', () => {
    const seq = new ProblemSequencer(settings({ categories: ['customTables'], customTables: [2], order: 'inOrder' }));
    const keys = Array.from({ length: 14 }, () => seq.next().key);
    expect(keys[0]).toBe('1*2');
    expect(keys[11]).toBe('12*2');
    expect(keys[12]).toBe('1*2');
  });

  it('falls back to random when in order is not possible', () => {
    const seq = new ProblemSequencer(settings({ categories: ['tables1to5', 'addition'], order: 'inOrder' }));
    expect(seq.isInOrder).toBe(false);
  });

  it('never repeats the same problem twice in a row', () => {
    const seq = new ProblemSequencer(settings({ categories: ['customTables'], customTables: [2] }), {
      rng: seededRng(1),
    });
    let last = '';
    for (let i = 0; i < 500; i++) {
      const key = seq.next().key;
      expect(key).not.toBe(last);
      last = key;
    }
  });

  it('shows weak facts more often when adaptive', () => {
    const weak = '7*8';
    const count = (adaptive: boolean) => {
      const seq = new ProblemSequencer(settings({ categories: ['tables6to10'], adaptive }), {
        rng: seededRng(3),
        weightOf: (key) => (key === weak ? 50 : 1),
      });
      return Array.from({ length: 3000 }, () => seq.next().key).filter((k) => k === weak).length;
    };
    expect(count(true)).toBeGreaterThan(count(false) * 3);
  });

  it('practises exactly the given facts', () => {
    const keys = ['7*8', '6*7', '12-5'];
    const seq = new ProblemSequencer(settings({}), { practiceKeys: keys, rng: seededRng(5) });
    const seen = new Set(Array.from({ length: 30 }, () => seq.next().key));
    expect([...seen].sort()).toEqual([...keys].sort());
  });
});

describe('multiple choice', () => {
  it('returns 4 unique options including the answer', () => {
    const rng = seededRng(9);
    for (let i = 0; i < 2000; i++) {
      const s = settings({
        categories: ['tables1to5', 'tables6to10', 'addition', 'subtraction', 'division'],
        mixedOperations: i % 2 === 0,
        negativeNumbers: i % 3 === 0,
      });
      const p = randomProblem(rng, s);
      const options = multipleChoiceOptions(p, rng);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(p.answer);
      if (!s.negativeNumbers) expect(options.every((o) => o >= 0)).toBe(true);
    }
  });

  it('includes a neighbouring table result for multiplication', () => {
    const p = makeProblem(op('*', num(7), num(8)));
    const found = Array.from({ length: 50 }, (_, i) => multipleChoiceOptions(p, seededRng(i))).flat();
    expect(found).toContain(48);
    expect(found).toContain(63);
  });

  it('includes the wrong-order answer for mixed problems', () => {
    const p = makeProblem(parseKey('2+3*4'));
    const found = Array.from({ length: 50 }, (_, i) => multipleChoiceOptions(p, seededRng(i))).flat();
    expect(found).toContain(20);
  });
});
