import type { ActivityDefinition } from '../types';

export function normalizeActivityLabel(value: string): string { return value.normalize('NFKC').trim().replace(/\s+/gu, ' '); }
export function activitySlug(value: string): string {
  if (/[\/#\r\n\t]/u.test(value)) throw new Error('invalid activity character');
  const slug = normalizeActivityLabel(value).replace(/\s+/gu, '-').replace(/-+/gu, '-').replace(/^-+|-+$/gu, '');
  if (!slug || /^\d+$/u.test(slug) || !/^[\p{L}\p{N}\p{M}_\-\p{S}\p{P}]+$/u.test(slug)) throw new Error('invalid activity slug');
  return slug;
}
export function isEffectivelyHidden(activity: ActivityDefinition, all: readonly ActivityDefinition[]): boolean {
  return activity.hidden || (activity.parentId !== null && all.some((item) => item.id === activity.parentId && item.hidden));
}
export function toggleActivitySelection(selected: readonly string[], activity: ActivityDefinition, all: readonly ActivityDefinition[]): string[] {
  if (selected.includes(activity.id)) return selected.filter((id) => id !== activity.id);
  if (activity.parentId === null) return [...selected.filter((id) => all.find((item) => item.id === id)?.parentId !== activity.id), activity.id];
  return [...selected.filter((id) => id !== activity.parentId), activity.id];
}
export function sortedActivities(all: readonly ActivityDefinition[], now: Date): ActivityDefinition[] {
  const recentCutoff = now.getTime() - 14 * 86400000;
  const time = (item: ActivityDefinition): number => item.lastUsedAt === null ? 0 : Date.parse(item.lastUsedAt);
  const group = (item: ActivityDefinition): number => time(item) >= recentCutoff ? 0 : item.usageCount > 0 ? 1 : 2;
  return all.filter((item) => !isEffectivelyHidden(item, all)).slice().sort((a, b) => {
    const ga = group(a); const gb = group(b); if (ga !== gb) return ga - gb;
    if (ga === 0) return time(b) - time(a);
    if (ga === 1) return b.usageCount - a.usageCount || time(b) - time(a);
    return a.sortOrder - b.sortOrder || a.label.localeCompare(b.label);
  });
}
export type ActivityGroup = 'recent' | 'frequent' | 'other';
export function activityGroup(activity: ActivityDefinition, now: Date): ActivityGroup {
  const recentCutoff = now.getTime() - 14 * 86400000;
  const lastUsed = activity.lastUsedAt === null ? 0 : Date.parse(activity.lastUsedAt);
  if (lastUsed >= recentCutoff) return 'recent';
  return activity.usageCount > 0 ? 'frequent' : 'other';
}
export function activityTag(activity: ActivityDefinition, all: readonly ActivityDefinition[]): string {
  if (activity.parentId === null) return `#activity/${activity.slug}`;
  const parent = all.find((item) => item.id === activity.parentId);
  if (parent === undefined) throw new Error('activity parent missing');
  return `#activity/${parent.slug}/${activity.slug}`;
}
