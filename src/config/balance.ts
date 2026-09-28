import type { Difficulty } from '../profiles/profile';
import { COLORS } from '../ui/theme';
import type { ShapeKind } from '../ui/shapes';

export type TowerType = 'blaster' | 'splash' | 'freezer';
export const TOWER_TYPES: readonly TowerType[] = ['blaster', 'splash', 'freezer'];

export interface TowerLevel {
  damage: number;
  range: number;
  /** Visual bullets per volley (damage is split over them). */
  shots: number;
  /** Splash radius (splash) or slow factor (freezer). */
  radius?: number;
  slow?: number;
  slowMs?: number;
}

export interface TowerSpec {
  color: number;
  cost: number;
  /** Upgrade costs to level 2 and 3. */
  upgrades: [number, number];
  levels: [TowerLevel, TowerLevel, TowerLevel];
}

export const TOWERS: Record<TowerType, TowerSpec> = {
  blaster: {
    color: COLORS.cyan,
    cost: 50,
    upgrades: [40, 80],
    levels: [
      { damage: 3, range: 170, shots: 1 },
      { damage: 5, range: 190, shots: 2 },
      { damage: 8, range: 215, shots: 3 },
    ],
  },
  splash: {
    color: COLORS.orange,
    cost: 80,
    upgrades: [60, 110],
    levels: [
      { damage: 2, range: 160, shots: 1, radius: 65 },
      { damage: 3, range: 175, shots: 1, radius: 75 },
      { damage: 5, range: 195, shots: 1, radius: 90 },
    ],
  },
  freezer: {
    color: COLORS.purple,
    cost: 60,
    upgrades: [50, 90],
    levels: [
      { damage: 1, range: 140, shots: 1, slow: 0.6, slowMs: 3500 },
      { damage: 1, range: 155, shots: 1, slow: 0.5, slowMs: 4000 },
      { damage: 2, range: 175, shots: 1, slow: 0.4, slowMs: 4500 },
    ],
  },
};

export const SELL_REFUND = 0.6;

/** The base cannon fires at the front enemy on every correct answer, anywhere on the map. */
export const BASE_DAMAGE = 2;

export type EnemyType = 'basic' | 'fast' | 'tank' | 'splitter' | 'mini' | 'boss';

export interface EnemySpec {
  shape: ShapeKind;
  color: number;
  hp: number;
  /** Pixels per second before difficulty scaling. */
  speed: number;
  radius: number;
  reward: number;
  /** Lives lost when reaching the base. */
  damage: number;
  splitInto?: { type: EnemyType; count: number };
}

export const ENEMIES: Record<EnemyType, EnemySpec> = {
  basic: { shape: 'circle', color: COLORS.green, hp: 5, speed: 40, radius: 17, reward: 3, damage: 1 },
  fast: { shape: 'triangle', color: COLORS.red, hp: 3, speed: 66, radius: 16, reward: 3, damage: 1 },
  tank: { shape: 'square', color: COLORS.primary, hp: 13, speed: 27, radius: 20, reward: 6, damage: 2 },
  splitter: {
    shape: 'pentagon',
    color: COLORS.pink,
    hp: 8,
    speed: 36,
    radius: 19,
    reward: 4,
    damage: 1,
    splitInto: { type: 'mini', count: 2 },
  },
  mini: { shape: 'diamond', color: COLORS.pink, hp: 2, speed: 58, radius: 11, reward: 1, damage: 1 },
  boss: { shape: 'hexagon', color: COLORS.yellow, hp: 55, speed: 21, radius: 32, reward: 30, damage: 5 },
};

export interface SpawnGroup {
  type: EnemyType;
  count: number;
  /** Seconds between spawns in this group. */
  interval: number;
  /** Seconds to wait before this group starts. */
  delay?: number;
}

export interface WaveSpec {
  groups: SpawnGroup[];
  boss?: boolean;
}

export const WAVES: WaveSpec[] = [
  { groups: [{ type: 'basic', count: 6, interval: 3.6 }] },
  { groups: [{ type: 'basic', count: 7, interval: 3.2 }, { type: 'fast', count: 2, interval: 3, delay: 2 }] },
  { groups: [{ type: 'basic', count: 6, interval: 3 }, { type: 'fast', count: 4, interval: 2.4, delay: 2 }] },
  { groups: [{ type: 'basic', count: 6, interval: 3 }, { type: 'tank', count: 3, interval: 4, delay: 2 }] },
  {
    boss: true,
    groups: [
      { type: 'basic', count: 6, interval: 2.8 },
      { type: 'boss', count: 1, interval: 1, delay: 3 },
    ],
  },
  { groups: [{ type: 'fast', count: 6, interval: 2.2 }, { type: 'splitter', count: 4, interval: 3.4, delay: 2 }] },
  {
    groups: [
      { type: 'basic', count: 8, interval: 2.4 },
      { type: 'tank', count: 4, interval: 3.6, delay: 1 },
      { type: 'fast', count: 3, interval: 2, delay: 1 },
    ],
  },
  { groups: [{ type: 'splitter', count: 6, interval: 3 }, { type: 'fast', count: 6, interval: 1.8, delay: 1 }] },
  {
    groups: [
      { type: 'basic', count: 10, interval: 2 },
      { type: 'tank', count: 5, interval: 3.2, delay: 1 },
      { type: 'fast', count: 5, interval: 1.6, delay: 1 },
    ],
  },
  {
    boss: true,
    groups: [
      { type: 'fast', count: 5, interval: 1.8 },
      { type: 'tank', count: 4, interval: 3, delay: 1 },
      { type: 'boss', count: 2, interval: 8, delay: 2 },
      { type: 'splitter', count: 4, interval: 2.6, delay: 2 },
    ],
  },
];

/** The tutorial is a single, slow wave; you can't lose. */
export const TUTORIAL_WAVE: WaveSpec = { groups: [{ type: 'basic', count: 8, interval: 4.5 }] };

/** Health grows by this factor every wave (compounding), so later waves need upgraded towers. */
export const HP_GROWTH_PER_WAVE = 1.2;

/** Health multiplier for the wave with this 0-based index. */
export const waveHpMultiplier = (index: number): number => HP_GROWTH_PER_WAVE ** index;

export interface DifficultySpec {
  speed: number;
  hp: number;
  lives: number;
  startCoins: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultySpec> = {
  easy: { speed: 0.7, hp: 0.8, lives: 15, startCoins: 80 },
  normal: { speed: 1, hp: 1, lives: 10, startCoins: 60 },
  hard: { speed: 1.25, hp: 1.25, lives: 7, startCoins: 40 },
};

export const TUTORIAL_SPEED = 0.45;

export const ECONOMY = {
  coinsPerCorrect: 5,
  /** Extra coin per correct answer in a streak, capped. */
  streakBonusMax: 5,
  waveClearBase: 20,
  waveClearPerWave: 5,
  pointsPerCorrect: 10,
  pointsPerKill: 5,
  pointsPerWave: 50,
  /** Seconds between waves before the next one starts by itself. */
  breakSeconds: 20,
};

export const STREAK_FOR_POWER_SHOT = 5;
export const POWER_SHOT_MULTIPLIER = 3;
