import type { Locale } from '../types';

export interface JournalSection { locale: Locale; heading: number; start: number; end: number; }

function headingLocale(line: string): Locale | null {
  const match = /^ {0,3}##\s+(日記|Journal)\s*#*\s*$/u.exec(line);
  if (match?.[1] === '日記') return 'ja';
  if (match?.[1] === 'Journal') return 'en';
  return null;
}
function isBoundary(line: string): boolean { return /^ {0,3}#{1,2}(?:\s|$)/u.test(line); }
export function findJournalSections(content: string): JournalSection[] {
  const lines = content.split(/\r\n|\n/u); const sections: JournalSection[] = []; let fence: { char: string; length: number } | null = null; let htmlComment = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (htmlComment) { if (line.includes('-->')) htmlComment = false; continue; }
    if (line.includes('<!--')) { if (!line.includes('-->')) htmlComment = true; continue; }
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/u.exec(line);
    if (fence !== null) { if (fenceMatch !== null && fenceMatch[1]?.[0] === fence.char && fenceMatch[1].length >= fence.length) fence = null; continue; }
    if (fenceMatch !== null) { fence = { char: fenceMatch[1]?.[0] ?? '`', length: fenceMatch[1]?.length ?? 3 }; continue; }
    if (/^\s*>/u.test(line)) continue;
    const locale = headingLocale(line);
    if (locale !== null) sections.push({ locale, heading: index, start: index + 1, end: lines.length });
  }
  for (const section of sections) for (let index = section.start; index < lines.length; index += 1) if (isBoundary(lines[index] ?? '')) { section.end = index; break; }
  return sections;
}
