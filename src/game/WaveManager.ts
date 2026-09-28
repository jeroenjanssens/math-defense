import type { EnemyType, WaveSpec } from '../config/balance';

export type WavePhase = 'break' | 'running' | 'finished';

export interface WaveUpdate {
  spawns: EnemyType[];
  waveStarted: boolean;
  waveCleared: boolean;
  allCleared: boolean;
}

interface ScheduledSpawn {
  atMs: number;
  type: EnemyType;
}

export const buildSchedule = (wave: WaveSpec): ScheduledSpawn[] => {
  const schedule: ScheduledSpawn[] = [];
  let t = 0;
  for (const group of wave.groups) {
    t += (group.delay ?? 0) * 1000;
    for (let i = 0; i < group.count; i++) {
      schedule.push({ atMs: t, type: group.type });
      if (i < group.count - 1) t += group.interval * 1000;
    }
    t += group.interval * 1000;
  }
  return schedule.sort((a, b) => a.atMs - b.atMs);
};

/** Runs the waves: a break (countdown) before every wave, then spawns on a schedule. */
export class WaveManager {
  phase: WavePhase = 'break';
  /** Index of the current (or upcoming) wave. */
  index = 0;
  breakLeftMs: number;
  private schedule: ScheduledSpawn[] = [];
  private elapsedMs = 0;
  private autoStart = true;

  constructor(
    private readonly waves: WaveSpec[],
    private readonly breakMs: number,
    firstBreakMs = breakMs,
  ) {
    this.breakLeftMs = firstBreakMs;
  }

  get total(): number {
    return this.waves.length;
  }

  /** 1-based number of the current or upcoming wave. */
  get waveNumber(): number {
    return Math.min(this.index + 1, this.total);
  }

  get currentSpec(): WaveSpec | undefined {
    return this.waves[this.index];
  }

  get remainingSpawns(): number {
    return this.schedule.length;
  }

  /** Stop the countdown from starting waves automatically (tutorial). */
  setAutoStart(enabled: boolean): void {
    this.autoStart = enabled;
  }

  startNow(): void {
    if (this.phase === 'break') this.breakLeftMs = 0;
  }

  update(deltaMs: number, enemiesAlive: number): WaveUpdate {
    const result: WaveUpdate = { spawns: [], waveStarted: false, waveCleared: false, allCleared: false };
    if (this.phase === 'finished') return result;

    if (this.phase === 'break') {
      if (this.autoStart || this.breakLeftMs <= 0) this.breakLeftMs -= deltaMs;
      if (this.breakLeftMs > 0) return result;
      this.phase = 'running';
      this.schedule = buildSchedule(this.waves[this.index]);
      this.elapsedMs = 0;
      result.waveStarted = true;
    }

    this.elapsedMs += deltaMs;
    while (this.schedule.length > 0 && this.schedule[0].atMs <= this.elapsedMs) {
      result.spawns.push(this.schedule.shift()!.type);
    }

    if (this.schedule.length === 0 && enemiesAlive === 0 && result.spawns.length === 0) {
      result.waveCleared = true;
      this.index++;
      if (this.index >= this.waves.length) {
        this.phase = 'finished';
        result.allCleared = true;
      } else {
        this.phase = 'break';
        this.breakLeftMs = this.breakMs;
      }
    }
    return result;
  }
}
