import type { Locale, LocalePreference, MoodJournalSettings } from '../types';
import { LABELS } from '../domain/mood';
import { createActivityId } from '../utils/id';

export function defaultSettings(localePreference: LocalePreference = 'auto', detectedLocale: Locale = 'en'): MoodJournalSettings {
  const locale = localePreference === 'auto' ? detectedLocale : localePreference;
  const now = new Date().toISOString(); const labels = { ...LABELS[locale] };
  return { schemaVersion: 1, setupCompleted: false, locale: localePreference, dailyNote: { mode: 'manual', manual: { folder: '', format: 'YYYY-MM-DD', templatePath: null } }, moodLabels: labels, activities: [locale === 'ja' ? '仕事' : 'Work', locale === 'ja' ? 'プライベート' : 'Personal'].map((label, sortOrder) => ({ id: createActivityId(), parentId: null, label, slug: label, hidden: false, sortOrder, createdAt: now, updatedAt: now })) };
}
