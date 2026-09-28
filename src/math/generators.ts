import { evaluate, hasGroupingBrackets, isClean, makeProblem, num, op } from './expr';
import { pick, randInt, type Rng } from './rng';
import type { Category, Expr, MathSettings, NumberSize, Op, Problem } from './types';
import { TABLE_CATEGORIES } from './types';

export const MAX_MULTIPLIER = 12;

/** Upper bound for addition and subtraction per number size. */
export const RANGE: Record<NumberSize, number> = { small: 20, medium: 100, large: 1000 };

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** All tables (1-12) enabled by the selected categories, sorted ascending. */
export const selectedTables = (settings: MathSettings): number[] => {
  const tables = new Set<number>();
  const cats = settings.categories;
  if (cats.includes('tables1to5')) range(1, 5).forEach((t) => tables.add(t));
  if (cats.includes('tables6to10')) range(6, 10).forEach((t) => tables.add(t));
  if (cats.includes('tables11to12')) range(11, 12).forEach((t) => tables.add(t));
  if (cats.includes('customTables')) settings.customTables.forEach((t) => tables.add(t));
  return [...tables].filter((t) => t >= 1 && t <= 12).sort((a, b) => a - b);
};

export const hasTables = (settings: MathSettings): boolean => selectedTables(settings).length > 0;

/** "In order" only makes sense when nothing but multiplication tables is selected. */
export const canUseInOrder = (settings: MathSettings): boolean =>
  settings.categories.length > 0 &&
  settings.categories.every((c) => TABLE_CATEGORIES.includes(c)) &&
  hasTables(settings) &&
  !settings.mixedOperations;

/** Categories that actually produce problems (e.g. custom tables with no tables picked produce nothing). */
export const effectiveCategories = (settings: MathSettings): Category[] => {
  const cats: Category[] = [];
  if (hasTables(settings)) cats.push('tables1to5');
  for (const c of ['addition', 'subtraction', 'division'] as const) {
    if (settings.categories.includes(c)) cats.push(c);
  }
  return cats;
};

export const isValidSelection = (settings: MathSettings): boolean => effectiveCategories(settings).length > 0;

const maybeNegate = (rng: Rng, value: number, settings: MathSettings, chance = 0.3): number =>
  settings.negativeNumbers && value !== 0 && rng() < chance ? -value : value;

/** Tables to use for multiplication and division (division without tables falls back to 1-10). */
const tablesFor = (settings: MathSettings): number[] => {
  const tables = selectedTables(settings);
  return tables.length > 0 ? tables : range(2, 10);
};

export const multiplicationExpr = (rng: Rng, settings: MathSettings): Expr => {
  const table = pick(rng, tablesFor(settings));
  const multiplier =
    settings.numberSize === 'large' && rng() < 0.5 ? randInt(rng, 13, 99) : randInt(rng, 1, MAX_MULTIPLIER);
  const a = maybeNegate(rng, multiplier, settings);
  const b = maybeNegate(rng, table, settings, 0.15);
  return rng() < 0.5 ? op('*', num(a), num(b)) : op('*', num(b), num(a));
};

export const divisionExpr = (rng: Rng, settings: MathSettings): Expr => {
  const divisor = pick(rng, tablesFor(settings));
  const quotient =
    settings.numberSize === 'large' && rng() < 0.5 ? randInt(rng, 13, 99) : randInt(rng, 1, MAX_MULTIPLIER);
  const dividend = maybeNegate(rng, divisor * quotient, settings);
  return op('/', num(dividend), num(maybeNegate(rng, divisor, settings, 0.15)));
};

export const additionExpr = (rng: Rng, settings: MathSettings): Expr => {
  const max = RANGE[settings.numberSize];
  if (settings.negativeNumbers && rng() < 0.4) {
    const a = randInt(rng, -max, max);
    const b = randInt(rng, -max, max);
    return op('+', num(a), num(b));
  }
  const sum = randInt(rng, 2, max);
  const a = randInt(rng, 1, sum - 1);
  return op('+', num(a), num(sum - a));
};

export const subtractionExpr = (rng: Rng, settings: MathSettings): Expr => {
  const max = RANGE[settings.numberSize];
  if (settings.negativeNumbers && rng() < 0.4) {
    const a = randInt(rng, 0, max);
    const b = randInt(rng, 1, max);
    return op('-', num(maybeNegate(rng, a, settings, 0.3)), num(b));
  }
  const a = randInt(rng, 2, max);
  const b = randInt(rng, 1, a - 1);
  return op('-', num(a), num(b));
};

const simpleExpr = (rng: Rng, category: Category, settings: MathSettings): Expr => {
  switch (category) {
    case 'addition':
      return additionExpr(rng, settings);
    case 'subtraction':
      return subtractionExpr(rng, settings);
    case 'division':
      return divisionExpr(rng, settings);
    default:
      return multiplicationExpr(rng, settings);
  }
};

const opFor = (category: Category): Op => {
  switch (category) {
    case 'addition':
      return '+';
    case 'subtraction':
      return '-';
    case 'division':
      return '/';
    default:
      return '*';
  }
};

/** Settings used for the building blocks of mixed problems: keep the numbers friendly. */
const mixedPartSettings = (settings: MathSettings): MathSettings => ({
  ...settings,
  numberSize: settings.numberSize === 'large' ? 'medium' : settings.numberSize,
});

const smallOperand = (rng: Rng, settings: MathSettings): number => {
  const max = Math.min(RANGE[settings.numberSize], 50);
  return maybeNegate(rng, randInt(rng, 1, max), settings, 0.2);
};

/**
 * Build a problem with two operators, e.g. `3 × 4 + 2`, `20 − 3 × 5` or `(2 + 3) × 4`.
 * Only operators from the enabled categories are used.
 */
export const mixedExpr = (rng: Rng, settings: MathSettings): Expr | null => {
  const ops = [...new Set(effectiveCategories(settings).map(opFor))];
  if (ops.length === 0) return null;
  const parts = mixedPartSettings(settings);
  const tables = tablesFor(settings);

  for (let attempt = 0; attempt < 100; attempt++) {
    const outer = pick(rng, ops);
    const inner = pick(rng, ops);
    const innerCategory: Category =
      inner === '+' ? 'addition' : inner === '-' ? 'subtraction' : inner === '/' ? 'division' : 'tables1to5';
    // Keep the inner part small so the outer operation stays doable in your head.
    const innerExpr = simpleExpr(rng, innerCategory, { ...parts, numberSize: 'small' });
    const innerValue = evaluate(innerExpr);

    let expr: Expr;
    if (outer === '*') {
      const factor = pick(rng, tables.filter((t) => t <= 10).length ? tables.filter((t) => t <= 10) : [2, 3, 4, 5]);
      expr = rng() < 0.5 ? op('*', innerExpr, num(factor)) : op('*', num(factor), innerExpr);
    } else if (outer === '/') {
      // Either (a ± b) : t with a divisible inner value, or a product divided by one of its divisors.
      const divisors = tables.filter((t) => t > 1 && innerValue !== 0 && innerValue % t === 0);
      if (divisors.length === 0) continue;
      expr = op('/', innerExpr, num(pick(rng, divisors)));
    } else {
      const other = smallOperand(rng, parts);
      expr = rng() < 0.5 ? op(outer, innerExpr, num(other)) : op(outer, num(other), innerExpr);
    }

    if (!settings.brackets && hasGroupingBrackets(expr)) continue;
    if (!isClean(expr, settings.negativeNumbers)) continue;
    const answer = evaluate(expr);
    if (Math.abs(answer) > 500) continue;
    return expr;
  }
  return null;
};

/** Generate a random problem from the selected categories (without order or adaptivity). */
export const randomProblem = (rng: Rng, settings: MathSettings): Problem => {
  const categories = effectiveCategories(settings);
  if (categories.length === 0) return makeProblem(multiplicationExpr(rng, settings));

  if (settings.mixedOperations && rng() < 0.6) {
    const expr = mixedExpr(rng, settings);
    if (expr) return makeProblem(expr);
  }

  const category = pick(rng, categories);
  return makeProblem(simpleExpr(rng, category, settings));
};

/** The fixed sequence 1 × t, 2 × t, … 12 × t for every selected table. */
export const inOrderSequence = (settings: MathSettings): Problem[] =>
  selectedTables(settings).flatMap((table) =>
    range(1, MAX_MULTIPLIER).map((m) => makeProblem(op('*', num(m), num(table)))),
  );
