import { getLanguage } from 'obsidian';
import en from './en';
import ja from './ja';
import { localeFromLanguage, type Locale, type LocalePreference } from './locale';

export { isLocalePreference, localeFromLanguage } from './locale';
export type { Locale, LocalePreference } from './locale';

const dictionaries = { en, ja };
export type TranslationKey = keyof typeof en;

export function resolveLocale(preference: LocalePreference): Locale {
  return preference === 'auto' ? localeFromLanguage(getLanguage()) : preference;
}

export function t(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale][key];
}
