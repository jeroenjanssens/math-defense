import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/profiles/profile';
import { ProfileStore, STORAGE_KEY, type StorageLike } from '../src/profiles/profileStore';
import {
  categorySummary,
  emptyProgress,
  mastery,
  practiceWeight,
  recordAnswer,
  recordSession,
  weakestFacts,
} from '../src/profiles/progress';

const memory = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

const avatar = { shape: 'star' as const, color: 0xff0000 };

describe('progress', () => {
  it('records answers and moves facts between boxes', () => {
    const p = emptyProgress();
    recordAnswer(p, '7*8', 'correct', 2000);
    recordAnswer(p, '7*8', 'correct', 2000);
    expect(p.facts['7*8']).toMatchObject({ n: 2, c: 2, box: 3 });
    recordAnswer(p, '7*8', 'wrong', 3000);
    expect(p.facts['7*8']).toMatchObject({ n: 3, w: 1, box: 0 });
    recordAnswer(p, '7*8', 'timeout', 15000);
    expect(p.facts['7*8'].t).toBe(1);
  });

  it('keeps 4×1 and 1×4 separate', () => {
    const p = emptyProgress();
    recordAnswer(p, '1*4', 'correct', 1000);
    recordAnswer(p, '4*1', 'wrong', 1000);
    expect(mastery(p.facts['1*4'])).not.toBe('bad');
    expect(mastery(p.facts['4*1'])).toBe('bad');
  });

  it('weights weak facts higher', () => {
    const p = emptyProgress();
    recordAnswer(p, '6*7', 'wrong', 1000);
    for (let i = 0; i < 4; i++) recordAnswer(p, '2*2', 'correct', 1000);
    expect(practiceWeight(p, '6*7')).toBeGreaterThan(practiceWeight(p, 'unseen'));
    expect(practiceWeight(p, 'unseen')).toBeGreaterThan(practiceWeight(p, '2*2'));
  });

  it('lists the weakest facts', () => {
    const p = emptyProgress();
    recordAnswer(p, '6*7', 'wrong', 1000);
    recordAnswer(p, '6*7', 'wrong', 1000);
    recordAnswer(p, '8*7', 'wrong', 1000);
    recordAnswer(p, '8*7', 'correct', 1000);
    recordAnswer(p, '2*2', 'correct', 1000);
    expect(weakestFacts(p)).toEqual(['6*7', '8*7']);
  });

  it('summarises per category', () => {
    const p = emptyProgress();
    recordAnswer(p, '6*7', 'correct', 1000);
    recordAnswer(p, '12+5', 'wrong', 1000);
    recordAnswer(p, '3*4+2', 'correct', 1000);
    const s = categorySummary(p);
    expect(s.multiplication).toEqual({ asked: 1, correct: 1 });
    expect(s.addition).toEqual({ asked: 1, correct: 0 });
    expect(s.mixed).toEqual({ asked: 1, correct: 1 });
  });

  it('caps the session history', () => {
    const p = emptyProgress();
    for (let i = 0; i < 60; i++) {
      recordSession(p, { date: i, durationMs: 0, asked: 0, correct: 0, wrong: 0, timeouts: 0, wave: 1, won: false, score: 0, bestStreak: 0 });
    }
    expect(p.sessions).toHaveLength(50);
    expect(p.sessions[0].date).toBe(10);
  });
});

describe('profile store', () => {
  it('persists profiles', () => {
    const storage = memory();
    const store = new ProfileStore(storage);
    const profile = createProfile('Sam', avatar, 'nl');
    store.add(profile);
    store.setLast(profile.id);
    const reloaded = new ProfileStore(storage);
    expect(reloaded.profiles.map((p) => p.name)).toEqual(['Sam']);
    expect(reloaded.lastProfileId).toBe(profile.id);
    expect(reloaded.get(profile.id)?.language).toBe('nl');
  });

  it('survives corrupt storage', () => {
    const storage = memory();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(new ProfileStore(storage).profiles).toHaveLength(0);
  });

  it('exports and imports, replacing profiles with the same name', () => {
    const a = new ProfileStore(memory());
    const sam = createProfile('Sam', avatar);
    sam.highScore = 999;
    a.add(sam);
    a.add(createProfile('Alex', avatar));

    const b = new ProfileStore(memory());
    b.add(createProfile('sam', avatar));
    expect(b.importJson(a.exportJson())).toBe(2);
    expect(b.profiles).toHaveLength(2);
    expect(b.profiles.find((p) => p.name === 'Sam')?.highScore).toBe(999);
  });

  it('rejects files that are not exports', () => {
    const store = new ProfileStore(memory());
    expect(() => store.importJson('{"hello": 1}')).toThrow();
    expect(() => store.importJson('nope')).toThrow();
  });

  it('fills in defaults for incomplete imported profiles', () => {
    const store = new ProfileStore(memory());
    store.importJson(JSON.stringify({ app: 'math-defense', version: 1, profiles: [{ name: 'Old' }] }));
    const p = store.profiles[0];
    expect(p.math.categories.length).toBeGreaterThan(0);
    expect(p.game.answerMode).toBe('typing');
    expect(p.progress.facts).toEqual({});
  });
});
