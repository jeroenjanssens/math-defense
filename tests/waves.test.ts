import { describe, expect, it } from 'vitest';
import { WAVES, type WaveSpec } from '../src/config/balance';
import { buildSchedule, WaveManager } from '../src/game/WaveManager';

const small: WaveSpec[] = [
  { groups: [{ type: 'basic', count: 2, interval: 1 }] },
  { groups: [{ type: 'fast', count: 1, interval: 1 }] },
];

describe('waves', () => {
  it('builds a schedule with delays and intervals', () => {
    const s = buildSchedule({
      groups: [
        { type: 'basic', count: 2, interval: 2 },
        { type: 'boss', count: 1, interval: 1, delay: 3 },
      ],
    });
    expect(s.map((x) => [x.atMs, x.type])).toEqual([
      [0, 'basic'],
      [2000, 'basic'],
      [7000, 'boss'],
    ]);
  });

  it('runs break, spawns and clears waves', () => {
    const wm = new WaveManager(small, 5000, 1000);
    expect(wm.update(500, 0).spawns).toEqual([]);
    const start = wm.update(600, 0);
    expect(start.waveStarted).toBe(true);
    expect(start.spawns).toEqual(['basic']);
    expect(wm.update(1000, 1).spawns).toEqual(['basic']);
    expect(wm.update(100, 2).waveCleared).toBe(false);
    const cleared = wm.update(100, 0);
    expect(cleared.waveCleared).toBe(true);
    expect(wm.phase).toBe('break');
    expect(wm.waveNumber).toBe(2);
    wm.startNow();
    expect(wm.update(16, 0).spawns).toEqual(['fast']);
    expect(wm.update(16, 0).allCleared).toBe(true);
    expect(wm.phase).toBe('finished');
  });

  it('waits for the player when auto start is off', () => {
    const wm = new WaveManager(small, 5000, 1000);
    wm.setAutoStart(false);
    expect(wm.update(10000, 0).waveStarted).toBe(false);
    wm.startNow();
    expect(wm.update(16, 0).waveStarted).toBe(true);
  });

  it('has ten waves with bosses on 5 and 10', () => {
    expect(WAVES).toHaveLength(10);
    expect(WAVES[4].boss).toBe(true);
    expect(WAVES[9].boss).toBe(true);
  });
});
