import { evaluate } from './expr';
import { randInt, shuffle, type Rng } from './rng';
import type { Expr, Problem } from './types';

/** Evaluate strictly left to right, ignoring precedence: a typical mistake with mixed operations. */
const leftToRight = (expr: Expr): number => {
  const flatten = (e: Expr, out: (number | string)[]): void => {
    if (e.kind === 'num') {
      out.push(e.value);
      return;
    }
    flatten(e.left, out);
    out.push(e.op);
    flatten(e.right, out);
  };
  const tokens: (number | string)[] = [];
  flatten(expr, tokens);
  let value = tokens[0] as number;
  for (let i = 1; i < tokens.length; i += 2) {
    const n = tokens[i + 1] as number;
    switch (tokens[i]) {
      case '+':
        value += n;
        break;
      case '-':
        value -= n;
        break;
      case '*':
        value *= n;
        break;
      case '/':
        value /= n;
        break;
    }
  }
  return value;
};

const swapDigits = (n: number): number | null => {
  const s = String(Math.abs(n));
  if (s.length !== 2 || s[0] === s[1]) return null;
  const swapped = Number(s[1] + s[0]);
  return n < 0 ? -swapped : swapped;
};

/** Wrong answers a child might plausibly give for this problem. */
export const plausibleWrongAnswers = (problem: Problem): number[] => {
  const { expr, answer } = problem;
  const candidates: number[] = [];

  if (expr.kind === 'op' && expr.left.kind === 'num' && expr.right.kind === 'num') {
    const a = expr.left.value;
    const b = expr.right.value;
    switch (expr.op) {
      case '*':
        candidates.push((a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), a + b);
        break;
      case '/':
        candidates.push(answer + 1, answer - 1, answer + 2, a - b);
        break;
      case '+':
        candidates.push(answer + 10, answer - 10, a - b);
        break;
      case '-':
        candidates.push(a + b, answer + 10, answer - 10, b - a);
        break;
    }
  } else {
    const wrongOrder = leftToRight(expr);
    if (Number.isInteger(wrongOrder)) candidates.push(wrongOrder);
  }

  candidates.push(answer + 1, answer - 1, answer + 2, answer - 2);
  const swapped = swapDigits(answer);
  if (swapped !== null) candidates.push(swapped);
  if (answer !== 0) candidates.push(-answer);
  return candidates;
};

/** Four shuffled options (the correct answer plus three plausible wrong ones). */
export const multipleChoiceOptions = (problem: Problem, rng: Rng = Math.random, count = 4): number[] => {
  const { answer } = problem;
  const allowNegative = answer < 0 || hasNegative(problem.expr);
  const valid = (n: number) => Number.isInteger(n) && n !== answer && (allowNegative || n >= 0);

  const wrong: number[] = [];
  for (const c of shuffle(rng, plausibleWrongAnswers(problem))) {
    if (wrong.length >= count - 1) break;
    if (valid(c) && !wrong.includes(c)) wrong.push(c);
  }
  for (let spread = 3; wrong.length < count - 1; spread++) {
    const c = answer + randInt(rng, -spread, spread);
    if (valid(c) && !wrong.includes(c)) wrong.push(c);
  }
  return shuffle(rng, [answer, ...wrong]);
};

const hasNegative = (expr: Expr): boolean =>
  expr.kind === 'num' ? expr.value < 0 : hasNegative(expr.left) || hasNegative(expr.right) || evaluate(expr) < 0;
