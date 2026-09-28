import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { notation, setLanguage, t } from '../src/i18n/i18n';
import { nl } from '../src/i18n/nl';
import { format, num, op } from '../src/math/expr';

describe('i18n', () => {
  it('has the same keys and placeholders in both languages', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(placeholders(nl[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('interpolates parameters', () => {
    setLanguage('nl');
    expect(t('menu.hello', { name: 'Sam' })).toBe('Hoi Sam!');
    setLanguage('en');
    expect(t('menu.hello', { name: 'Sam' })).toBe('Hi Sam!');
  });

  it('uses : for division in Dutch and ÷ in English', () => {
    const e = op('/', num(56), num(7));
    expect(format(e, notation('nl'))).toBe('56 : 7');
    expect(format(e, notation('en'))).toBe('56 ÷ 7');
    setLanguage('nl');
    expect(t('settings.cat.division')).toBe('Delen :');
  });
});
