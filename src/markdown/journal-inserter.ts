import type { JournalEntry } from '../types';
import { generateCallout } from './callout-generator';
import { parseMoodLogs } from './callout-parser';
import { journalHeading } from './journal-locale';
import { findJournalSections } from './journal-section-parser';
import { indexedLines, insertBlockAt, lineStartOffset, newlineOf } from './newline';

export class DuplicateJournalHeadingError extends Error {}
export function insertJournalEntry(content: string, entry: JournalEntry): string {
  const newline = newlineOf(content); const sections = findJournalSections(content).filter((section) => section.locale === entry.locale);
  if (sections.length > 1) throw new DuplicateJournalHeadingError('duplicate journal heading');
  const callout = generateCallout(entry, newline);
  if (sections.length === 0) {
    return insertBlockAt(content, content.length, `${journalHeading(entry.locale)}${newline}${newline}${callout}`, newline);
  }
  const section = sections[0]; if (section === undefined) throw new Error('unreachable');
  const lines = indexedLines(content);
  const logs = parseMoodLogs(lines.slice(section.start, section.end).map((line) => line.text)).map((log) => ({ ...log, start: log.start + section.start, end: log.end + section.start }));
  const later = logs.find((log) => Date.parse(log.occurredAt) > Date.parse(entry.occurredAt));
  const last = logs[logs.length - 1];
  const insertionLine = later?.start ?? (last === undefined ? section.start : last.end + 1);
  return insertBlockAt(content, lineStartOffset(lines, insertionLine, content.length), callout, newline);
}
