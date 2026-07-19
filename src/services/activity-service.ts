import { activitySlug, isEffectivelyHidden } from '../domain/activity';
import type { ActivityDefinition } from '../types';
import { createActivityId } from '../utils/id';
import { MoodJournalError } from '../utils/errors';

const sameSlug = (left: string, right: string): boolean => left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0;
export class ActivityService {
  add(activities: readonly ActivityDefinition[], parentId: string | null, label: string, now: string): { activities: ActivityDefinition[]; selectedId: string } {
    const slug = activitySlug(label); const parent = parentId === null ? null : activities.find((activity) => activity.id === parentId && activity.parentId === null);
    if (parentId !== null && parent === undefined) throw new MoodJournalError('INVALID_ACTIVITY', 'error.invalidActivity');
    const duplicate = activities.find((activity) => activity.parentId === parentId && sameSlug(activity.slug, slug));
    if (duplicate !== undefined) return { activities: activities.map((activity) => activity.id === duplicate.id ? { ...activity, hidden: false, updatedAt: now } : activity), selectedId: duplicate.id };
    const item: ActivityDefinition = { id: createActivityId(), parentId, label: label.trim().replace(/\s+/gu, ' '), slug, hidden: false, sortOrder: activities.filter((activity) => activity.parentId === parentId).length, usageCount: 0, lastUsedAt: null, createdAt: now, updatedAt: now };
    return { activities: [...activities, item], selectedId: item.id };
  }
  rename(activities: readonly ActivityDefinition[], id: string, label: string, now: string): ActivityDefinition[] {
    const current = activities.find((activity) => activity.id === id); if (current === undefined) throw new MoodJournalError('INVALID_ACTIVITY', 'error.invalidActivity');
    const slug = activitySlug(label); const collision = activities.find((activity) => activity.id !== id && activity.parentId === current.parentId && sameSlug(activity.slug, slug));
    if (collision !== undefined) throw new MoodJournalError('ACTIVITY_CONFLICT', 'error.activityConflict');
    return activities.map((activity) => activity.id === id ? { ...activity, label: label.trim().replace(/\s+/gu, ' '), slug, updatedAt: now } : activity);
  }
  setHidden(activities: readonly ActivityDefinition[], id: string, hidden: boolean, now: string): ActivityDefinition[] {
    if (!activities.some((activity) => activity.id === id)) throw new MoodJournalError('INVALID_ACTIVITY', 'error.invalidActivity');
    return activities.map((activity) => activity.id === id ? { ...activity, hidden, updatedAt: now } : activity);
  }
  visible(activities: readonly ActivityDefinition[]): ActivityDefinition[] { return activities.filter((activity) => !isEffectivelyHidden(activity, activities)); }
}
