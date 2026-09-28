import type { Expr, FactCategory, Op, Problem } from './types';

export const num = (value: number): Expr => ({ kind: 'num', value });

export const op = (o: Op, left: Expr, right: Expr): Expr => ({ kind: 'op', op: o, left, right });

const precedence = (o: Op): number => (o === '+' || o === '-' ? 1 : 2);

export const evaluate = (expr: Expr): number => {
  if (expr.kind === 'num') return expr.value;
  const l = evaluate(expr.left);
  const r = evaluate(expr.right);
  switch (expr.op) {
    case '+':
      return l + r;
    case '-':
      return l - r;
    case '*':
      return l * r;
    case '/':
      return l / r;
  }
};

/** Whether every intermediate value is an integer (and, optionally, non-negative). */
export const isClean = (expr: Expr, allowNegative: boolean): boolean => {
  if (expr.kind === 'num') return allowNegative || expr.value >= 0;
  if (!isClean(expr.left, allowNegative) || !isClean(expr.right, allowNegative)) return false;
  if (expr.op === '/' && evaluate(expr.right) === 0) return false;
  const value = evaluate(expr);
  return Number.isInteger(value) && (allowNegative || value >= 0);
};

export const operatorCount = (expr: Expr): number =>
  expr.kind === 'num' ? 0 : 1 + operatorCount(expr.left) + operatorCount(expr.right);

export interface Notation {
  times: string;
  divide: string;
  plus: string;
  minus: string;
  /** Unary minus sign for negative numbers. */
  negative: string;
  /** Put spaces around binary operators. */
  spaced: boolean;
}

export const ASCII_NOTATION: Notation = {
  times: '*',
  divide: '/',
  plus: '+',
  minus: '-',
  negative: '-',
  spaced: false,
};

const needsParens = (child: Expr, parent: Op, side: 'left' | 'right'): boolean => {
  if (child.kind === 'num') return false;
  const cp = precedence(child.op);
  const pp = precedence(parent);
  if (cp < pp) return true;
  // a - (b + c), a / (b * c), a * (b / c) keep their brackets on the right-hand side.
  if (side === 'right' && cp === pp && (parent === '-' || parent === '/' || child.op === '/' || child.op === '-')) {
    return true;
  }
  return false;
};

export const format = (expr: Expr, notation: Notation = ASCII_NOTATION, leading = true): string => {
  if (expr.kind === 'num') {
    if (expr.value < 0) {
      const text = `${notation.negative}${Math.abs(expr.value)}`;
      return leading ? text : `(${text})`;
    }
    return String(expr.value);
  }
  const symbol = { '+': notation.plus, '-': notation.minus, '*': notation.times, '/': notation.divide }[expr.op];
  const wrap = (child: Expr, side: 'left' | 'right', isLeading: boolean): string => {
    if (needsParens(child, expr.op, side)) return `(${format(child, notation, true)})`;
    return format(child, notation, isLeading);
  };
  const left = wrap(expr.left, 'left', leading);
  const right = wrap(expr.right, 'right', false);
  return notation.spaced ? `${left} ${symbol} ${right}` : `${left}${symbol}${right}`;
};

export const keyOf = (expr: Expr): string => format(expr, ASCII_NOTATION);

export const categoryOf = (expr: Expr): FactCategory => {
  if (expr.kind === 'num') return 'addition';
  if (operatorCount(expr) > 1) return 'mixed';
  switch (expr.op) {
    case '+':
      return 'addition';
    case '-':
      return 'subtraction';
    case '*':
      return 'multiplication';
    case '/':
      return 'division';
  }
};

export const makeProblem = (expr: Expr): Problem => ({
  expr,
  answer: evaluate(expr),
  key: keyOf(expr),
  category: categoryOf(expr),
});

/** Parse a canonical ASCII key (as produced by `keyOf`) back into an expression. */
export const parseKey = (key: string): Expr => {
  let pos = 0;
  const peek = () => key[pos];

  const parseNumber = (): Expr => {
    if (peek() === '(') {
      pos++;
      const inner = parseSum();
      if (peek() !== ')') throw new Error(`Expected ) at ${pos} in ${key}`);
      pos++;
      return inner;
    }
    let negative = false;
    if (peek() === '-') {
      negative = true;
      pos++;
    }
    const start = pos;
    while (pos < key.length && /[0-9]/.test(key[pos])) pos++;
    if (start === pos) throw new Error(`Expected number at ${pos} in ${key}`);
    const value = Number(key.slice(start, pos));
    return num(negative ? -value : value);
  };

  const parseProduct = (): Expr => {
    let left = parseNumber();
    while (peek() === '*' || peek() === '/') {
      const o = peek() as Op;
      pos++;
      left = op(o, left, parseNumber());
    }
    return left;
  };

  const parseSum = (): Expr => {
    let left = parseProduct();
    while (peek() === '+' || peek() === '-') {
      const o = peek() as Op;
      pos++;
      left = op(o, left, parseProduct());
    }
    return left;
  };

  const result = parseSum();
  if (pos !== key.length) throw new Error(`Unexpected ${peek()} at ${pos} in ${key}`);
  return result;
};

/** Whether formatting the expression requires grouping brackets (negative-number brackets don't count). */
export const hasGroupingBrackets = (expr: Expr): boolean => {
  if (expr.kind === 'num') return false;
  return (
    needsParens(expr.left, expr.op, 'left') ||
    needsParens(expr.right, expr.op, 'right') ||
    hasGroupingBrackets(expr.left) ||
    hasGroupingBrackets(expr.right)
  );
};
