import type { Notation } from '../math/expr';
import { en, type TranslationKey } from './en';
import { nl } from './nl';

export type Language = 'en' | 'nl';
export const LANGUAGES: readonly Language[] = ['nl', 'en'];

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, nl };

let current: Language = 'en';
const listeners = new Set<(lang: Language) => void>();

export const browserLanguage = (): Language =>
  typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('nl') ? 'nl' : 'en';

export const getLanguage = (): Language => current;

export const setLanguage = (lang: Language): void => {
  if (lang === current) return;
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach((fn) => fn(lang));
};

export const onLanguageChange = (fn: (lang: Language) => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export type Params = Record<string, string | number>;

/** Translate a key, replacing `{name}` placeholders with the given parameters. */
export const t = (key: TranslationKey, params: Params = {}): string => {
  const template = dictionaries[current][key] ?? en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : name === 'divide' ? notation().divide : `{${name}}`,
  );
};

/** Math notation as taught in schools: Dutch uses `:` for division, English `÷`. */
export const notation = (lang: Language = current): Notation => ({
  times: '×',
  divide: lang === 'nl' ? ':' : '÷',
  plus: '+',
  minus: '−',
  negative: '−',
  spaced: true,
});

/** Format a (possibly negative) number with a proper minus sign. */
export const formatNumber = (n: number): string => (n < 0 ? `−${Math.abs(n)}` : String(n));

export const formatDate = (timestamp: number, lang: Language = current): string =>
  new Date(timestamp).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
