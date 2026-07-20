import type { Locale } from '../types';

export function journalHeading(locale: Locale): string { return locale === 'ja' ? '## 日記' : '## Journal'; }
export function journalRoot(locale: Locale): string { return locale === 'ja' ? '#日記' : '#journal'; }
export function journalTag(locale: Locale, slugPath: readonly string[]): string { return [journalRoot(locale), ...slugPath].join('/'); }
