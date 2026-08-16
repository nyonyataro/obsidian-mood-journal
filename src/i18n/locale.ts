export type Locale = 'en' | 'ja';
export type LocalePreference = 'auto' | Locale;

export function isLocalePreference(value: unknown): value is LocalePreference {
  return value === 'auto' || value === 'en' || value === 'ja';
}

export function localeFromLanguage(language: string): Locale {
  return language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}
