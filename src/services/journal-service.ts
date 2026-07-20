import type { TFile } from 'obsidian';
import { activityLabelPath, activitySlugPath } from '../domain/activity';
import { MOODS, isMoodScore } from '../domain/mood';
import type { JournalDraft, JournalEntry, MoodJournalSettings } from '../types';
import { parseManualDateTime, toOffsetIso, uniqueEntryDate } from '../utils/datetime';
import { MoodJournalError } from '../utils/errors';
import type { DailyNoteService } from './daily-note-service';

export class JournalService {
  constructor(private readonly dailyNotes: DailyNoteService, private readonly settings: () => MoodJournalSettings) {}
  async saveDraft(draft: JournalDraft): Promise<{ file: TFile; entry: JournalEntry }> {
    if (!isMoodScore(draft.moodScore)) throw new MoodJournalError('INVALID_MOOD', 'error.moodRequired');
    const date = draft.dateTimeMode === 'manual' ? parseManualDateTime(draft.manualDate, draft.manualTime) : new Date();
    if (date === null) throw new MoodJournalError('INVALID_MOOD', 'error.invalidDate');
    const entry = this.createEntry(draft, date);
    const file = await this.dailyNotes.writeEntry(entry);
    return { file, entry };
  }
  createEntry(draft: JournalDraft, date: Date): JournalEntry {
    if (!isMoodScore(draft.moodScore)) throw new MoodJournalError('INVALID_MOOD', 'error.moodRequired');
    const settings = this.settings();
    const selected = draft.activityIds.map((id) => settings.activities.find((activity) => activity.id === id)).filter((activity): activity is NonNullable<typeof activity> => activity !== undefined);
    if (selected.length !== draft.activityIds.length) throw new MoodJournalError('INVALID_ACTIVITY', 'error.invalidActivity');
    const id = toOffsetIso(uniqueEntryDate(date, []));
    return {
      locale: settings.locale,
      id,
      occurredAt: id,
      moodScore: draft.moodScore,
      moodEmoji: MOODS[draft.moodScore],
      moodLabel: settings.moodLabels[draft.moodScore],
      activities: selected.map((activity) => ({
        activityId: activity.id,
        labelPath: activityLabelPath(activity, settings.activities).join('/'),
        slugPath: activitySlugPath(activity, settings.activities)
      })),
      memo: draft.memo
    };
  }
}
