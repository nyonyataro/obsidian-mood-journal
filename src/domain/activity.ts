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
export function activityTag(activity: ActivityDefinition, all: readonly ActivityDefinition[]): string {
  if (activity.parentId === null) return `#activity/${activity.slug}`;
  const parent = all.find((item) => item.id === activity.parentId);
  if (parent === undefined) throw new Error('activity parent missing');
  return `#activity/${parent.slug}/${activity.slug}`;
}
