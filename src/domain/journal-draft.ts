import type { JournalDraft } from '../types';

export function isDraftDirty(draft: JournalDraft): boolean {
  return draft.moodScore !== null || draft.activityIds.length > 0 || draft.memo !== '' || draft.dateTimeMode === 'manual';
}
