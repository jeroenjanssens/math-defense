import { normalizeProfile, type Profile } from './profile';

export const STORAGE_KEY = 'math-defense:v1';
export const MAX_PROFILES = 8;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredData {
  version: 1;
  profiles: Profile[];
  lastProfileId: string | null;
}

export interface ExportFile {
  app: 'math-defense';
  version: 1;
  exportedAt: number;
  profiles: Profile[];
}

const memoryStorage = (): StorageLike => {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

const defaultStorage = (): StorageLike => {
  try {
    const probe = '__math-defense-probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return memoryStorage();
  }
};

/** Loads and saves all profiles in a single localStorage entry. */
export class ProfileStore {
  private data: StoredData;

  constructor(private readonly storage: StorageLike = defaultStorage()) {
    this.data = this.load();
  }

  private load(): StoredData {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const profiles = (Array.isArray(parsed.profiles) ? parsed.profiles : [])
          .map(normalizeProfile)
          .filter((p: Profile | null): p is Profile => p !== null);
        return { version: 1, profiles, lastProfileId: parsed.lastProfileId ?? null };
      }
    } catch {
      // Corrupt data: start fresh rather than crash.
    }
    return { version: 1, profiles: [], lastProfileId: null };
  }

  save(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage full or unavailable; keep playing with in-memory data.
    }
  }

  get profiles(): readonly Profile[] {
    return this.data.profiles;
  }

  get lastProfileId(): string | null {
    return this.data.lastProfileId;
  }

  get(id: string): Profile | undefined {
    return this.data.profiles.find((p) => p.id === id);
  }

  get isFull(): boolean {
    return this.data.profiles.length >= MAX_PROFILES;
  }

  add(profile: Profile): void {
    this.data.profiles.push(profile);
    this.save();
  }

  update(profile: Profile): void {
    const index = this.data.profiles.findIndex((p) => p.id === profile.id);
    if (index >= 0) this.data.profiles[index] = profile;
    else this.data.profiles.push(profile);
    this.save();
  }

  remove(id: string): void {
    this.data.profiles = this.data.profiles.filter((p) => p.id !== id);
    if (this.data.lastProfileId === id) this.data.lastProfileId = null;
    this.save();
  }

  setLast(id: string): void {
    this.data.lastProfileId = id;
    this.save();
  }

  exportJson(): string {
    const file: ExportFile = { app: 'math-defense', version: 1, exportedAt: Date.now(), profiles: this.data.profiles };
    return JSON.stringify(file, null, 2);
  }

  /**
   * Import profiles from an export file. Profiles with the same id or name replace existing ones.
   * Returns the number of imported profiles; throws when the file is not valid.
   */
  importJson(json: string): number {
    const parsed = JSON.parse(json);
    if (!parsed || parsed.app !== 'math-defense' || !Array.isArray(parsed.profiles)) {
      throw new Error('Not a Math Defense export file');
    }
    const imported = parsed.profiles.map(normalizeProfile).filter((p: Profile | null): p is Profile => p !== null);
    for (const profile of imported) {
      const existing = this.data.profiles.findIndex(
        (p) => p.id === profile.id || p.name.toLowerCase() === profile.name.toLowerCase(),
      );
      if (existing >= 0) this.data.profiles[existing] = profile;
      else if (this.data.profiles.length < MAX_PROFILES) this.data.profiles.push(profile);
    }
    this.save();
    return imported.length;
  }
}

let instance: ProfileStore | null = null;

export const profileStore = (): ProfileStore => (instance ??= new ProfileStore());
