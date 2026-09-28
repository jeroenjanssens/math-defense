import { browserLanguage, getLanguage, setLanguage, t, type Language } from '../i18n/i18n';
import { createProfile, type Profile } from '../profiles/profile';
import { profileStore } from '../profiles/profileStore';

const DEVICE_LANGUAGE_KEY = 'math-defense:language';

/** The language used before a profile is chosen (profile screen). */
export const deviceLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(DEVICE_LANGUAGE_KEY);
    if (stored === 'nl' || stored === 'en') return stored;
  } catch {
    // ignore
  }
  return browserLanguage();
};

export const setDeviceLanguage = (lang: Language): void => {
  try {
    localStorage.setItem(DEVICE_LANGUAGE_KEY, lang);
  } catch {
    // ignore
  }
  setLanguage(lang);
};

const GUEST_ID = 'guest';

let currentId: string | null = null;
/** The guest only lives in memory: nothing is written to storage. */
let guest: Profile | null = null;

export const playAsGuest = (): Profile => {
  guest = { ...createProfile(t('profiles.guestName'), { shape: 'star', color: 0xffd60a }, getLanguage()), id: GUEST_ID };
  currentId = GUEST_ID;
  return guest;
};

export const isGuest = (): boolean => currentId === GUEST_ID;

export const selectProfile = (id: string): Profile => {
  const profile = profileStore().get(id);
  if (!profile) throw new Error(`Unknown profile ${id}`);
  currentId = id;
  profileStore().setLast(id);
  setLanguage(profile.language);
  return profile;
};

export const currentProfile = (): Profile | undefined => {
  if (currentId === GUEST_ID) return guest ?? undefined;
  return currentId ? profileStore().get(currentId) : undefined;
};

/** The current profile; throws when none is selected (scenes after the profile screen). */
export const requireProfile = (): Profile => {
  const profile = currentProfile();
  if (!profile) throw new Error('No profile selected');
  return profile;
};

export const saveProfile = (profile: Profile = requireProfile()): void => {
  if (profile.id === GUEST_ID) guest = profile;
  else profileStore().update(profile);
};

export const clearProfile = (): void => {
  currentId = null;
  guest = null;
  setLanguage(deviceLanguage());
};
