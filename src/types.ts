export type Locale = 'ja' | 'en';
export type MoodScore = 1 | 2 | 3 | 4 | 5;
export type DailyNoteMode = 'follow-core' | 'manual';

export interface ActivityDefinition { id: string; parentId: string | null; label: string; slug: string; hidden: boolean; sortOrder: number; createdAt: string; updatedAt: string; }
export interface ManualDailyNoteSettings { folder: string; format: string; templatePath: string | null; }
export interface DailyNoteIntegrationSettings { mode: DailyNoteMode; manual: ManualDailyNoteSettings; }
export interface MoodJournalSettings { schemaVersion: 1; setupCompleted: boolean; locale: Locale; dailyNote: DailyNoteIntegrationSettings; moodLabels: Record<MoodScore, string>; activities: ActivityDefinition[]; }
export interface JournalDraft { moodScore: MoodScore | null; activityIds: string[]; memo: string; dateTimeMode: 'auto' | 'manual'; manualDate: string; manualTime: string; }
export interface ActivitySnapshot { activityId: string; labelPath: string; slugPath: string[]; }
export interface JournalEntry { locale: Locale; id: string; occurredAt: string; moodScore: MoodScore; moodEmoji: string; moodLabel: string; activities: ActivitySnapshot[]; memo: string; }
export interface ParsedMoodLog { start: number; end: number; occurredAt: string; id: string; score: MoodScore; }
