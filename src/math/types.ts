export type Category =
  | 'tables1to5'
  | 'tables6to10'
  | 'tables11to12'
  | 'customTables'
  | 'addition'
  | 'subtraction'
  | 'division';

export const TABLE_CATEGORIES: readonly Category[] = [
  'tables1to5',
  'tables6to10',
  'tables11to12',
  'customTables',
];

export const ALL_CATEGORIES: readonly Category[] = [
  ...TABLE_CATEGORIES,
  'addition',
  'subtraction',
  'division',
];

/** Category of a stored fact; mixed problems get their own bucket. */
export type FactCategory = 'multiplication' | 'addition' | 'subtraction' | 'division' | 'mixed';

export type NumberSize = 'small' | 'medium' | 'large';

export type ProblemOrder = 'random' | 'inOrder';

export interface MathSettings {
  categories: Category[];
  /** Tables picked individually when `customTables` is enabled. */
  customTables: number[];
  numberSize: NumberSize;
  negativeNumbers: boolean;
  mixedOperations: boolean;
  brackets: boolean;
  order: ProblemOrder;
  adaptive: boolean;
}

export type Op = '+' | '-' | '*' | '/';

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'op'; op: Op; left: Expr; right: Expr };

export interface Problem {
  expr: Expr;
  answer: number;
  /** Canonical ASCII representation, used as the statistics key. */
  key: string;
  category: FactCategory;
}

export const defaultMathSettings = (): MathSettings => ({
  categories: ['tables1to5', 'tables6to10'],
  customTables: [],
  numberSize: 'medium',
  negativeNumbers: false,
  mixedOperations: false,
  brackets: false,
  order: 'random',
  adaptive: true,
});
