import { describe, expect, it } from 'vitest';
import { isLocalePreference, localeFromLanguage } from '../src/i18n/locale';
import { defaultSettings } from '../src/settings/defaults';

describe('locale preference', () => {
  it('defaults new settings to automatic detection', () => {
    expect(defaultSettings().locale).toBe('auto');
  });

  it('recognizes Japanese language codes and falls back to English', () => {
    expect(localeFromLanguage('ja-JP')).toBe('ja');
    expect(localeFromLanguage('en-US')).toBe('en');
    expect(localeFromLanguage('fr-FR')).toBe('en');
  });

  it('validates stored preferences', () => {
    expect(isLocalePreference('auto')).toBe(true);
    expect(isLocalePreference('ja')).toBe(true);
    expect(isLocalePreference('fr')).toBe(false);
  });
});
