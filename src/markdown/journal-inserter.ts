import type { JournalEntry } from '../types';
import { generateCallout } from './callout-generator';
import { parseMoodLogs } from './callout-parser';
import { journalHeading } from './journal-locale';
import { findJournalSections } from './journal-section-parser';
import { newlineOf, withFinalNewline } from './newline';

export class DuplicateJournalHeadingError extends Error {}
export function insertJournalEntry(content: string, entry: JournalEntry): string {
  const newline = newlineOf(content); const sections = findJournalSections(content).filter((section) => section.locale === entry.locale);
  if (sections.length > 1) throw new DuplicateJournalHeadingError('duplicate journal heading');
  const callout = generateCallout(entry, newline); let lines = content ? content.replace(/(?:\r\n|\n)$/u, '').split(/\r\n|\n/u) : [];
  if (sections.length === 0) {
    const prefix = lines.length === 0 ? [journalHeading(entry.locale), ''] : ['', journalHeading(entry.locale), ''];
    return withFinalNewline([...lines, ...prefix, ...callout.split(newline)].join(newline), newline);
  }
  const section = sections[0]; if (section === undefined) throw new Error('unreachable');
  const logs = parseMoodLogs(lines.slice(section.start, section.end)).map((log) => ({ ...log, start: log.start + section.start }));
  const later = logs.find((log) => Date.parse(log.occurredAt) > Date.parse(entry.occurredAt));
  const at = later === undefined ? section.end : later.start;
  const addition = [...callout.split(newline), ''];
  if (at === section.start && (lines[at] ?? '') === '') lines.splice(at, 1, ...addition); else lines.splice(at, 0, ...(at > section.start && lines[at - 1] !== '' ? [''] : []), ...addition);
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return withFinalNewline(lines.join(newline), newline);
}
