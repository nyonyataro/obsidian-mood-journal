import { activitySlug } from '../domain/activity';
import { isMoodScore, LABELS } from '../domain/mood';
import type { MoodJournalSettings } from '../types';
import { defaultSettings } from './defaults';

const record = (value: unknown): Record<string, unknown> | null => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
export function migrateSettings(raw: unknown): MoodJournalSettings {
  if (raw === null || raw === undefined) return defaultSettings(); const data = record(raw); if (data === null) return defaultSettings();
  if (typeof data.schemaVersion === 'number' && data.schemaVersion > 1) throw new Error('settings incompatible');
  const locale = data.locale === 'ja' || data.locale === 'en' ? data.locale : 'en'; const base = defaultSettings(locale);
  const labelsRaw = record(data.moodLabels); const moodLabels: Record<1 | 2 | 3 | 4 | 5, string> = { ...LABELS[locale] };
  for (const score of [1, 2, 3, 4, 5] as const) { const label = labelsRaw?.[String(score)]; if (typeof label === 'string' && label.length >= 1 && label.length <= 30 && !/[\r\n]/u.test(label)) moodLabels[score] = label; }
  const dailyRaw = record(data.dailyNote); const manualRaw = record(dailyRaw?.manual); const folder = typeof manualRaw?.folder === 'string' ? manualRaw.folder : ''; const format = typeof manualRaw?.format === 'string' && manualRaw.format.trim() ? manualRaw.format : 'YYYY-MM-DD'; const templatePath = typeof manualRaw?.templatePath === 'string' && manualRaw.templatePath ? manualRaw.templatePath : null;
  const activities = Array.isArray(data.activities) ? data.activities.flatMap((value, index) => { const a = record(value); if (a === null || typeof a.id !== 'string' || typeof a.label !== 'string') return []; try { return [{ id: a.id, parentId: typeof a.parentId === 'string' ? a.parentId : null, label: a.label.trim().replace(/\s+/gu, ' '), slug: activitySlug(a.label), hidden: a.hidden === true, sortOrder: typeof a.sortOrder === 'number' ? a.sortOrder : index, usageCount: typeof a.usageCount === 'number' && a.usageCount >= 0 ? a.usageCount : 0, lastUsedAt: typeof a.lastUsedAt === 'string' ? a.lastUsedAt : null, createdAt: typeof a.createdAt === 'string' ? a.createdAt : '', updatedAt: typeof a.updatedAt === 'string' ? a.updatedAt : '' }]; } catch { return []; } }) : base.activities;
  return { schemaVersion: 1, setupCompleted: data.setupCompleted === true, locale, dailyNote: { mode: dailyRaw?.mode === 'follow-core' ? 'follow-core' : 'manual', manual: { folder, format, templatePath } }, moodLabels, activities: activities.length ? activities : base.activities };
}
export function validMood(value: unknown): boolean { return isMoodScore(value); }
