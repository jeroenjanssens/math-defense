import { describe, expect, it } from 'vitest';
import { evaluate, format, hasGroupingBrackets, keyOf, num, op, parseKey } from '../src/math/expr';

const spaced = { times: '×', divide: ':', plus: '+', minus: '−', negative: '−', spaced: true };

describe('expressions', () => {
  it('evaluates with the tree structure', () => {
    expect(evaluate(op('+', op('*', num(3), num(4)), num(2)))).toBe(14);
    expect(evaluate(op('*', op('+', num(2), num(3)), num(4)))).toBe(20);
  });

  it('adds brackets only where needed', () => {
    expect(format(op('+', op('*', num(3), num(4)), num(2)), spaced)).toBe('3 × 4 + 2');
    expect(format(op('*', op('+', num(2), num(3)), num(4)), spaced)).toBe('(2 + 3) × 4');
    expect(format(op('-', num(20), op('+', num(3), num(5))), spaced)).toBe('20 − (3 + 5)');
    expect(format(op('-', op('+', num(20), num(3)), num(5)), spaced)).toBe('20 + 3 − 5');
  });

  it('wraps negative operands in brackets, except at the start', () => {
    expect(format(op('*', num(5), num(-3)), spaced)).toBe('5 × (−3)');
    expect(format(op('+', num(-3), num(7)), spaced)).toBe('−3 + 7');
  });

  it('detects grouping brackets', () => {
    expect(hasGroupingBrackets(op('*', op('+', num(2), num(3)), num(4)))).toBe(true);
    expect(hasGroupingBrackets(op('*', num(5), num(-3)))).toBe(false);
  });

  it('round-trips keys through the parser', () => {
    const exprs = [
      op('*', num(7), num(8)),
      op('/', num(56), num(7)),
      op('+', num(-3), num(7)),
      op('*', num(5), num(-3)),
      op('*', op('+', num(2), num(3)), num(4)),
      op('-', num(20), op('*', num(3), num(5))),
      op('-', num(20), op('-', num(8), num(5))),
    ];
    for (const e of exprs) {
      const key = keyOf(e);
      expect(keyOf(parseKey(key))).toBe(key);
      expect(evaluate(parseKey(key))).toBe(evaluate(e));
    }
  });
});
