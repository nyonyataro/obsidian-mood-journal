import en from './en'; import ja from './ja'; import type { Locale } from '../types';
const dictionaries = { en, ja }; export type TranslationKey = keyof typeof en;
export function t(locale: Locale, key: TranslationKey): string { return dictionaries[locale][key]; }
