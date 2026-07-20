import type { JournalEntry } from '../types';
import { journalRoot, journalTag } from './journal-locale';
import { newlineOf } from './newline';

export function generateCallout(entry: JournalEntry, newline = '\n'): string {
  const time = entry.occurredAt.slice(11, 16);
  const root = journalRoot(entry.locale);
  const tags = [root, ...entry.activities.map((activity) => journalTag(entry.locale, activity.slugPath))].join(' ');
  const lines = [`> [!mood-log] ${time} ${entry.moodEmoji} ${entry.moodLabel}`, `> ${tags}`, `> <!-- mood-log-id: ${entry.id} -->`, `> <!-- mood-score: ${entry.moodScore} -->`];
  if (/\S/u.test(entry.memo)) { lines.push(...entry.memo.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map((line) => line ? `> ${line}` : '>')); }
  return lines.join(newline);
}
export function generatedCalloutForContent(entry: JournalEntry, content: string): string { return generateCallout(entry, newlineOf(content)); }
