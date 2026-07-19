import type { TFile } from 'obsidian';
import { MOODS, isMoodScore } from '../domain/mood';
import { activityTag } from '../domain/activity';
import type { JournalDraft, JournalEntry, MoodJournalSettings } from '../types';
import { parseManualDateTime, toOffsetIso, uniqueEntryDate } from '../utils/datetime';
import { MoodJournalError } from '../utils/errors';
import type { DailyNoteService } from './daily-note-service';

export class JournalService {
  constructor(private readonly dailyNotes: DailyNoteService, private readonly settings: () => MoodJournalSettings) {}
  async saveDraft(draft: JournalDraft): Promise<{ file: TFile; entry: JournalEntry }> { if (!isMoodScore(draft.moodScore)) throw new MoodJournalError('INVALID_MOOD', 'error.moodRequired'); const date = draft.dateTimeMode === 'manual' ? parseManualDateTime(draft.manualDate, draft.manualTime) : new Date(); if (date === null) throw new MoodJournalError('INVALID_MOOD', 'error.invalidDate'); const all = this.settings().activities; const selected = draft.activityIds.map((id) => all.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => a !== undefined); if (selected.length !== draft.activityIds.length) throw new MoodJournalError('INVALID_ACTIVITY', 'error.invalidActivity'); const path = await this.dailyNotes.getTargetPath(toOffsetIso(date)); const entry = this.entry(date, draft, selected, path); const file = await this.dailyNotes.writeEntry(entry); return { file, entry }; }
  private entry(date: Date, draft: JournalDraft, activities: MoodJournalSettings['activities'], _path: string): JournalEntry { const settings = this.settings(); const id = toOffsetIso(uniqueEntryDate(date, [])); const score = draft.moodScore as NonNullable<typeof draft.moodScore>; return { id, occurredAt: id, moodScore: score, moodEmoji: MOODS[score], moodLabel: settings.moodLabels[score], activities: activities.map((a) => ({ activityId: a.id, labelPath: a.parentId === null ? a.label : `${settings.activities.find((p) => p.id === a.parentId)?.label ?? ''}/${a.label}`, tag: activityTag(a, settings.activities) })), memo: draft.memo }; }
}
