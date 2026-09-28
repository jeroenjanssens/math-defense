import { browserLanguage, type Language } from '../i18n/i18n';
import { defaultMathSettings, type MathSettings } from '../math/types';
import { emptyProgress, type Progress } from './progress';

export type AnswerMode = 'typing' | 'choice';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type NumpadMode = 'auto' | 'on' | 'off';

export interface GameSettings {
  answerMode: AnswerMode;
  timerEnabled: boolean;
  timerSeconds: number;
  difficulty: Difficulty;
  numpad: NumpadMode;
}

export const TIMER_OPTIONS = [5, 10, 15, 20, 30] as const;

export const AVATAR_SHAPES = ['circle', 'triangle', 'square', 'diamond', 'pentagon', 'hexagon', 'star'] as const;
export type AvatarShape = (typeof AVATAR_SHAPES)[number];

export const AVATAR_COLORS = [0xff4d6d, 0xff9f1c, 0xffd60a, 0x4ade80, 0x22d3ee, 0x6c8cff, 0xc77dff, 0xff70c8] as const;

export interface Avatar {
  shape: AvatarShape;
  color: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: Avatar;
  language: Language;
  math: MathSettings;
  game: GameSettings;
  progress: Progress;
  highScore: number;
  bestWave: number;
  tutorialDone: boolean;
  createdAt: number;
}

export const defaultGameSettings = (): GameSettings => ({
  answerMode: 'typing',
  timerEnabled: false,
  timerSeconds: 15,
  difficulty: 'normal',
  numpad: 'auto',
});

const randomId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const createProfile = (name: string, avatar: Avatar, language: Language = browserLanguage()): Profile => ({
  id: randomId(),
  name: name.trim().slice(0, 16),
  avatar,
  language,
  math: defaultMathSettings(),
  game: defaultGameSettings(),
  progress: emptyProgress(),
  highScore: 0,
  bestWave: 0,
  tutorialDone: false,
  createdAt: Date.now(),
});

/** Fill in missing fields of a (possibly older or imported) profile with defaults. */
export const normalizeProfile = (raw: unknown): Profile | null => {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<Profile>;
  if (typeof p.name !== 'string' || !p.name.trim()) return null;
  const math = { ...defaultMathSettings(), ...(p.math ?? {}) };
  const game = { ...defaultGameSettings(), ...(p.game ?? {}) };
  return {
    id: typeof p.id === 'string' ? p.id : randomId(),
    name: p.name.trim().slice(0, 16),
    avatar: {
      shape: AVATAR_SHAPES.includes(p.avatar?.shape as AvatarShape) ? p.avatar!.shape : 'circle',
      color: typeof p.avatar?.color === 'number' ? p.avatar.color : AVATAR_COLORS[0],
    },
    language: p.language === 'nl' || p.language === 'en' ? p.language : browserLanguage(),
    math,
    game,
    progress: {
      facts: p.progress?.facts && typeof p.progress.facts === 'object' ? p.progress.facts : {},
      sessions: Array.isArray(p.progress?.sessions) ? p.progress.sessions : [],
    },
    highScore: Number(p.highScore) || 0,
    bestWave: Number(p.bestWave) || 0,
    tutorialDone: Boolean(p.tutorialDone),
    createdAt: Number(p.createdAt) || Date.now(),
  };
};
