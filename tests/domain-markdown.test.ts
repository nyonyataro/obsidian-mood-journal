import { describe, expect, it } from 'vitest';
import { activityLabelPath, activitySlug, activitySlugPath, isEffectivelyHidden, toggleActivitySelection } from '../src/domain/activity';
import { generateCallout } from '../src/markdown/callout-generator';
import { parseMoodLogs } from '../src/markdown/callout-parser';
import { DuplicateJournalHeadingError, insertJournalEntry } from '../src/markdown/journal-inserter';
import { journalHeading, journalRoot, journalTag } from '../src/markdown/journal-locale';
import { findJournalSections } from '../src/markdown/journal-section-parser';
import { newlineOf, withFinalNewline } from '../src/markdown/newline';
import { generateDailyNotePath } from '../src/services/daily-note-path';
import { renderTemplate } from '../src/services/template-renderer';
import { ActivityService } from '../src/services/activity-service';
import { JournalService } from '../src/services/journal-service';
import { isDraftDirty } from '../src/domain/journal-draft';
import { migrateSettings } from '../src/settings/migration';
import { parseCoreDailyNoteSettings } from '../src/services/daily-note-config-parser';
import { localDateInputValue, localTimeInputValue, parseManualDateTime, toOffsetIso, uniqueEntryDate } from '../src/utils/datetime';
import type { ActivityDefinition, JournalEntry, MoodJournalSettings } from '../src/types';

const entry: JournalEntry = { locale: 'ja', id: '2026-07-20T18:30:00.000+09:00', occurredAt: '2026-07-20T18:30:00.000+09:00', moodScore: 4, moodEmoji: '🙂', moodLabel: '良い', activities: [], memo: '' };
const item = (id: string, parentId: string | null, label: string, hidden = false): ActivityDefinition => ({ id, parentId, label, slug: activitySlug(label), hidden, sortOrder: 0, createdAt: '', updatedAt: '' });

const settings = (locale: 'ja' | 'en'): MoodJournalSettings => ({
  schemaVersion: 1,
  setupCompleted: true,
  locale,
  dailyNote: { mode: 'manual', manual: { folder: '', format: 'YYYY-MM-DD', templatePath: null } },
  moodLabels: { 1: locale === 'ja' ? '最悪' : 'Awful', 2: locale === 'ja' ? '悪い' : 'Bad', 3: locale === 'ja' ? '普通' : 'Okay', 4: locale === 'ja' ? '良い' : 'Good', 5: locale === 'ja' ? '最高' : 'Great' },
  activities: [item('work', null, locale === 'ja' ? '仕事' : 'Work'), item('meeting', 'work', locale === 'ja' ? '会議' : 'Meeting')]
});

describe('activity', () => {
  it('normalizes spaces, NFKC, hyphens and rejects unsafe values', () => { expect(activitySlug(' 映画　 鑑賞 ')).toBe('映画-鑑賞'); expect(activitySlug('a---b')).toBe('a-b'); expect(() => activitySlug('123')).toThrow(); expect(() => activitySlug('a/b')).toThrow(); });
  it('enforces parent child exclusive selection', () => { const parent = item('p', null, 'Work'); const child = item('c', 'p', 'Meeting'); expect(toggleActivitySelection(['c'], parent, [parent, child])).toEqual(['p']); expect(toggleActivitySelection(['p'], child, [parent, child])).toEqual(['c']); });
  it('adds duplicate by selecting it, and hides/restores activities', () => { const service = new ActivityService(); const now = '2026-07-20T00:00:00.000Z'; const first = service.add([], null, 'Work', now); const duplicate = service.add([{ ...first.activities[0] as ActivityDefinition, hidden: true }], null, 'work', now); expect(duplicate.selectedId).toBe(first.selectedId); expect(duplicate.activities[0]?.hidden).toBe(false); expect(service.setHidden(duplicate.activities, first.selectedId, true, now)[0]?.hidden).toBe(true); });
  it('rejects a rename collision and allows child slugs under different parents', () => { const service = new ActivityService(); const now = '2026-07-20T00:00:00.000Z'; const work = service.add([], null, 'Work', now); const personal = service.add(work.activities, null, 'Personal', now); const childWork = service.add(personal.activities, work.selectedId, 'Walk', now); const childPersonal = service.add(childWork.activities, personal.selectedId, 'Walk', now); expect(childPersonal.activities).toHaveLength(4); expect(() => service.rename(childPersonal.activities, personal.selectedId, 'Work', now)).toThrow(); });
  it('makes a hidden parent hide its child without changing child state', () => { const parent = item('p', null, 'Work', true); const child = item('c', 'p', 'Walk'); expect(isEffectivelyHidden(child, [parent, child])).toBe(true); expect(child.hidden).toBe(false); });
  it('rejects slash, hash, newline and tab in tag labels', () => { for (const value of ['a#b', 'a\nb', 'a\tb']) expect(() => activitySlug(value)).toThrow(); });
  it('keeps a child hidden after its parent is restored', () => { const parent = item('p', null, 'P', false); const child = item('c', 'p', 'C', true); expect(isEffectivelyHidden(parent, [parent, child])).toBe(false); expect(isEffectivelyHidden(child, [parent, child])).toBe(true); });
  it('treats English slugs case-insensitively for duplicates', () => { const service = new ActivityService(); const first = service.add([], null, 'Work', '2026-01-01T00:00:00.000Z'); const second = service.add(first.activities, null, 'work', '2026-01-01T00:00:00.000Z'); expect(second.activities).toHaveLength(1); expect(second.selectedId).toBe(first.selectedId); });
  it('does not allow a child below a missing parent', () => { expect(() => new ActivityService().add([], 'missing', 'Child', '2026-01-01T00:00:00.000Z')).toThrow(); });
  it('returns label and slug paths without a journal namespace', () => { const parent = item('p', null, 'Work Space'); const child = item('c', 'p', 'Team Meeting'); expect(activityLabelPath(child, [parent, child])).toEqual(['Work Space', 'Team Meeting']); expect(activitySlugPath(child, [parent, child])).toEqual(['Work-Space', 'Team-Meeting']); });
  it('updates future child paths when a parent is renamed', () => { const service = new ActivityService(); const now = '2026-01-01T00:00:00.000Z'; const parent = service.add([], null, 'Work', now); const child = service.add(parent.activities, parent.selectedId, 'Meeting', now); const renamed = service.rename(child.activities, parent.selectedId, 'Office', now); const childItem = renamed.find((activity) => activity.id === child.selectedId); expect(childItem === undefined ? [] : activitySlugPath(childItem, renamed)).toEqual(['Office', 'Meeting']); });
});

describe('markdown', () => {
  it('provides localized journal headings and roots', () => { expect(journalHeading('ja')).toBe('## 日記'); expect(journalHeading('en')).toBe('## Journal'); expect(journalRoot('ja')).toBe('#日記'); expect(journalRoot('en')).toBe('#journal'); expect(journalTag('en', ['Work', 'Meeting'])).toBe('#journal/Work/Meeting'); });
  it('generates localized root tags when no activity is selected', () => { expect(generateCallout(entry)).toContain('> #日記\n'); expect(generateCallout({ ...entry, locale: 'en', moodLabel: 'Good' })).toContain('> #journal\n'); });
  it('generates localized parent, child, and multiple nested tags', () => {
    const parent = { activityId: 'work', labelPath: '仕事', slugPath: ['仕事'] };
    const child = { activityId: 'meeting', labelPath: '仕事/会議', slugPath: ['仕事', '会議'] };
    const walk = { activityId: 'walk', labelPath: 'プライベート/散歩', slugPath: ['プライベート', '散歩'] };
    expect(generateCallout({ ...entry, activities: [parent] })).toContain('> #日記/仕事\n');
    expect(generateCallout({ ...entry, activities: [child] })).toContain('> #日記/仕事/会議\n');
    expect(generateCallout({ ...entry, activities: [child, walk] })).toContain('> #日記/仕事/会議 #日記/プライベート/散歩\n');
    expect(generateCallout({ ...entry, locale: 'en', moodLabel: 'Good', activities: [{ activityId: 'meeting', labelPath: 'Work/Meeting', slugPath: ['Work', 'Meeting'] }] })).toContain('> #journal/Work/Meeting\n');
  });
  it('never generates the legacy activity namespace', () => { expect(generateCallout({ ...entry, activities: [{ activityId: 'x', labelPath: '仕事/会議', slugPath: ['仕事', '会議'] }] })).not.toContain('#activity/'); });
  it('generates callout with CRLF and memo', () => { const result = generateCallout({ ...entry, activities: [{ activityId: 'x', labelPath: '仕事/会議', slugPath: ['仕事', '会議'] }], memo: 'a\n\n- b' }, '\r\n'); expect(result).toContain('> #日記/仕事/会議\r\n'); expect(result).toContain('>\r\n> - b'); });
  it('generates no trailing blank quote when memo is absent', () => { const result = generateCallout(entry); expect(result).not.toContain('\n>\n'); expect(result.split('\n')).toHaveLength(4); });
  it('uses the selected mood label and preserves explicit LF line endings', () => { const result = generateCallout({ ...entry, moodLabel: 'Great', memo: '- one\n- two' }, '\n'); expect(result).toContain('🙂 Great'); expect(result).toContain('> - one\n> - two'); expect(result).not.toContain('\r\n'); });
  it('parses valid logs and safely ignores malformed logs', () => { const lines = generateCallout(entry).split('\n'); expect(parseMoodLogs(lines)).toHaveLength(1); lines[3] = '> <!-- mood-score: 9 -->'; expect(parseMoodLogs(lines)).toHaveLength(0); });
  it('accepts collapsed callouts and rejects duplicate metadata', () => { const collapsed = generateCallout(entry).replace('[!mood-log]', '[!mood-log]+').split('\n'); expect(parseMoodLogs(collapsed)).toHaveLength(1); collapsed.push(`> <!-- mood-score: ${entry.moodScore} -->`); expect(parseMoodLogs(collapsed)).toHaveLength(0); });
  it('rejects a duplicate hidden ID or score metadata line', () => { const lines = generateCallout(entry).split('\n'); lines.push(`> <!-- mood-log-id: ${entry.id} -->`); expect(parseMoodLogs(lines)).toEqual([]); });
  it('rejects missing, invalid, and timezone-less IDs', () => { const missing = generateCallout(entry).split('\n').filter((line) => !line.includes('mood-log-id')); expect(parseMoodLogs(missing)).toHaveLength(0); const timezoneLess = generateCallout({ ...entry, id: '2026-07-20T18:30:00.000', occurredAt: '2026-07-20T18:30:00.000' }).split('\n'); expect(parseMoodLogs(timezoneLess)).toHaveLength(0); });
  it('does not confuse HTML comments inside memo with metadata', () => { const lines = generateCallout({ ...entry, memo: '<!-- user note -->' }).split('\n'); expect(parseMoodLogs(lines)).toHaveLength(1); });
  it('recognizes a manually edited title when metadata is valid', () => { const lines = generateCallout(entry).replace('18:30 🙂 良い', 'custom title').split('\n'); expect(parseMoodLogs(lines)).toHaveLength(1); });
  it('finds only real localized journal headings', () => { const content = '```md\n## 日記\n```\n> ## Journal\n<!--\n## Journal\n-->\n## 日記 ##\n### inside\n## Journal\ntext\n## next'; expect(findJournalSections(content)).toEqual([{ locale: 'ja', heading: 7, start: 8, end: 9 }, { locale: 'en', heading: 9, start: 10, end: 11 }]); });
  it('handles empty content, frontmatter, H1 boundaries and H3 content', () => { expect(findJournalSections('')).toEqual([]); expect(findJournalSections('---\ntitle: x\n---\n## 日記\n### keep\n# end')).toEqual([{ locale: 'ja', heading: 3, start: 4, end: 5 }]); });
  it('ignores tilde fences and supports closing hashes and extra heading spaces', () => { const content = '~~~~\n## Journal\n~~~~\n##   Journal ##\ntext\n## next'; expect(findJournalSections(content)).toEqual([{ locale: 'en', heading: 3, start: 4, end: 5 }]); });
  it('keeps H3 and lower headings inside the journal section', () => { expect(findJournalSections('## 日記\n### note\n#### detail\n## end')).toEqual([{ locale: 'ja', heading: 0, start: 1, end: 3 }]); });
  it('inserts past time before later log and preserves content', () => { const late = { ...entry, id: '2026-07-20T20:00:00.000+09:00', occurredAt: '2026-07-20T20:00:00.000+09:00' }; const initial = `before\n\n## 日記\n\n${generateCallout(late)}\n\nfree text\n`; const result = insertJournalEntry(initial, entry); expect(result.indexOf(entry.id)).toBeLessThan(result.indexOf(late.id)); expect(result).toContain('free text'); expect(result.endsWith('\n')).toBe(true); });
  it('adds same-time entry after existing entry and preserves CRLF', () => { const old = { ...entry, memo: 'old' }; const result = insertJournalEntry(`## 日記\r\n\r\n${generateCallout(old, '\r\n')}\r\n`, { ...entry, memo: 'new' }); expect(result.indexOf('old')).toBeLessThan(result.indexOf('new')); expect(result).toContain('\r\n'); });
  it('stops safely for duplicate headings in the active language', () => { expect(() => insertJournalEntry('## 日記\n\n## 日記\n', entry)).toThrow(DuplicateJournalHeadingError); expect(() => insertJournalEntry('## Journal\n\n## Journal\n', { ...entry, locale: 'en' })).toThrow(DuplicateJournalHeadingError); });
  it('does not block writes for duplicate headings in the inactive language', () => { expect(() => insertJournalEntry('## Journal\n\n## Journal\n', entry)).not.toThrow(); expect(() => insertJournalEntry('## 日記\n\n## 日記\n', { ...entry, locale: 'en' })).not.toThrow(); });
  it('keeps malformed callouts untouched while adding a valid log', () => { const broken = '> [!mood-log] 12:00 🙂\n> <!-- mood-score: 4 -->'; const result = insertJournalEntry(`## 日記\n\n${broken}\n`, entry); expect(result).toContain(broken); expect(result).toContain(entry.id); });
  it('creates localized journal sections after existing content', () => { const japanese = insertJournalEntry('frontmatter text\n', entry); const english = insertJournalEntry(japanese, { ...entry, locale: 'en', id: '2026-07-20T20:00:00.000+09:00', occurredAt: '2026-07-20T20:00:00.000+09:00', moodLabel: 'Good' }); expect(english).toContain('frontmatter text\n\n## 日記\n\n'); expect(english).toContain('\n## Journal\n\n'); });
  it('creates the first localized journal section in an empty note', () => { expect(insertJournalEntry('', entry)).toBe(`## 日記\n\n${generateCallout(entry)}\n`); const english = { ...entry, locale: 'en' as const, moodLabel: 'Good' }; expect(insertJournalEntry('', english)).toBe(`## Journal\n\n${generateCallout(english)}\n`); });
  it('coexists across languages and reuses the section after switching back', () => { const englishEntry = { ...entry, locale: 'en' as const, id: '2026-07-20T20:00:00.000+09:00', occurredAt: '2026-07-20T20:00:00.000+09:00', moodLabel: 'Good' }; const laterJapanese = { ...entry, id: '2026-07-20T21:00:00.000+09:00', occurredAt: '2026-07-20T21:00:00.000+09:00' }; const both = insertJournalEntry(insertJournalEntry('', entry), englishEntry); const result = insertJournalEntry(both, laterJapanese); expect(result.match(/^## 日記$/gmu)).toHaveLength(1); expect(result.match(/^## Journal$/gmu)).toHaveLength(1); expect(result.indexOf(entry.id)).toBeLessThan(result.indexOf(laterJapanese.id)); expect(result.indexOf(laterJapanese.id)).toBeLessThan(result.indexOf(englishEntry.id)); });
  it('places a future entry at the end without reordering existing entries', () => { const early = { ...entry, id: '2026-07-20T10:00:00.000+09:00', occurredAt: '2026-07-20T10:00:00.000+09:00' }; const future = { ...entry, id: '2026-07-20T22:00:00.000+09:00', occurredAt: '2026-07-20T22:00:00.000+09:00' }; const result = insertJournalEntry(`## 日記\n\n${generateCallout(early)}\n`, future); expect(result.indexOf(early.id)).toBeLessThan(result.indexOf(future.id)); });
  it('does not move non-log Markdown around a middle insertion', () => { const early = { ...entry, id: '2026-07-20T10:00:00.000+09:00', occurredAt: '2026-07-20T10:00:00.000+09:00' }; const late = { ...entry, id: '2026-07-20T20:00:00.000+09:00', occurredAt: '2026-07-20T20:00:00.000+09:00' }; const result = insertJournalEntry(`## 日記\n\n${generateCallout(early)}\n\nmanual paragraph\n\n${generateCallout(late)}\n`, entry); expect(result.indexOf('manual paragraph')).toBeGreaterThan(result.indexOf(early.id)); expect(result.indexOf('manual paragraph')).toBeLessThan(result.indexOf(late.id)); });
  it('uses the single existing journal section even when it is empty', () => { const result = insertJournalEntry('## 日記\n\n## Other\n', entry); expect(result).toContain(`## 日記\n\n${generateCallout(entry)}\n\n## Other`); });
  it('preserves legacy activity tags without rewriting them', () => { const legacy = '> [!mood-log] 10:00 🙂 良い\n> #日記 #activity/プライベート/散歩\n> <!-- mood-log-id: 2026-07-20T10:00:00.000+09:00 -->\n> <!-- mood-score: 4 -->'; const result = insertJournalEntry(`## 日記\n\n${legacy}\n`, entry); expect(result).toContain(legacy); });
  it('preserves LF and CRLF detection and ends with exactly one newline', () => { expect(newlineOf('a\r\nb')).toBe('\r\n'); expect(newlineOf('a\nb')).toBe('\n'); expect(withFinalNewline('a\n\n', '\n')).toBe('a\n'); expect(withFinalNewline('a\r\n\r\n', '\r\n')).toBe('a\r\n'); });
});

describe('journal service', () => {
  it('builds the same locale-aware entry shape used by save and Markdown copy', () => { const current = settings('ja'); const service = new JournalService(undefined as never, () => current); const draft = { moodScore: 4 as const, activityIds: ['meeting'], memo: 'memo', dateTimeMode: 'auto' as const, manualDate: '', manualTime: '' }; const built = service.createEntry(draft, new Date('2026-07-20T00:00:00.000Z')); expect(built.locale).toBe('ja'); expect(built.activities[0]).toMatchObject({ labelPath: '仕事/会議', slugPath: ['仕事', '会議'] }); current.locale = 'en'; current.moodLabels[4] = 'Good'; current.activities = settings('en').activities; const english = service.createEntry(draft, new Date('2026-07-20T00:00:00.000Z')); expect(english.locale).toBe('en'); expect(english.moodLabel).toBe('Good'); expect(english.activities[0]).toMatchObject({ labelPath: 'Work/Meeting', slugPath: ['Work', 'Meeting'] }); });
});

describe('paths templates datetime', () => {
  it('generates safe nested daily paths', () => { expect(generateDailyNotePath({ folder: 'Daily Notes', format: 'YYYY/MM/YYYY-MM-DD', templatePath: null }, (f) => f.replace('YYYY/MM/YYYY-MM-DD', '2026/07/2026-07-20'))).toBe('Daily Notes/2026/07/2026-07-20.md'); expect(() => generateDailyNotePath({ folder: '', format: '../x', templatePath: null }, (f) => f)).toThrow(); });
  it('supports root paths and prevents duplicate extensions and absolute paths', () => { expect(generateDailyNotePath({ folder: '', format: 'day.md', templatePath: null }, (f) => f)).toBe('day.md'); expect(() => generateDailyNotePath({ folder: '', format: 'C:/day', templatePath: null }, (f) => f)).toThrow(); expect(() => generateDailyNotePath({ folder: '/root', format: 'day', templatePath: null }, (f) => f)).toThrow(); });
  it('rejects traversal in folder paths and blank file names', () => { expect(() => generateDailyNotePath({ folder: 'Daily/../Private', format: 'day', templatePath: null }, (f) => f)).toThrow(); expect(() => generateDailyNotePath({ folder: '', format: '', templatePath: null }, () => '')).toThrow(); });
  it('expands known template variables only', () => { expect(renderTemplate('{{title}} {{date:YYYY/MM/DD}} {{time}} {{unknown}} <% x %>', 'day', (f) => f === 'HH:mm' ? '18:30' : '2026/07/20')).toBe('day 2026/07/20 18:30 {{unknown}} <% x %>'); });
  it('uses default date and time formats independently', () => { expect(renderTemplate('{{date}} {{time:HH-mm}}', 'title', (format) => format === 'YYYY-MM-DD' ? '2026-07-20' : '18-30')).toBe('2026-07-20 18-30'); });
  it('preserves malformed template variables', () => { expect(renderTemplate('{{date {{time:}}', 'day', () => 'x')).toBe('{{date {{time:}}'); });
  it('makes datetime IDs unique', () => { const date = new Date('2026-07-20T00:00:00.000Z'); const id = toOffsetIso(date); expect(uniqueEntryDate(date, [id]).getTime()).toBe(date.getTime() + 1); });
  it('increments repeatedly colliding IDs until unique', () => { const date = new Date('2026-07-20T00:00:00.000Z'); const ids = [toOffsetIso(date), toOffsetIso(new Date(date.getTime() + 1))]; expect(uniqueEntryDate(date, ids).getTime()).toBe(date.getTime() + 2); });
  it('parses valid manual dates and rejects invalid controls', () => { expect(parseManualDateTime('2026-07-20', '18:30')?.getSeconds()).toBe(0); expect(parseManualDateTime('20-07-2026', '18:30')).toBeNull(); expect(parseManualDateTime('2026-07-20', '25:00')).toBeNull(); });
  it('keeps manual date boundaries and sets seconds to zero', () => { const date = parseManualDateTime('2026-12-31', '23:59'); expect(date?.getFullYear()).toBe(2026); expect(date?.getMonth()).toBe(11); expect(date?.getDate()).toBe(31); expect(date?.getSeconds()).toBe(0); expect(date?.getMilliseconds()).toBe(0); });
  it('formats native date and time inputs in local time', () => { const date = new Date(2026, 0, 2, 3, 4); expect(localDateInputValue(date)).toBe('2026-01-02'); expect(localTimeInputValue(date)).toBe('03:04'); });
  it('keeps local offset in generated ISO identifiers', () => { expect(toOffsetIso(new Date('2026-07-20T00:00:00.000Z'))).toMatch(/[+-]\d{2}:\d{2}$/u); });
});

describe('settings migration', () => {
  it('creates defaults when data is absent', () => { expect(migrateSettings(undefined).schemaVersion).toBe(1); });
  it('migrates v0-like data and rejects unknown future schemas', () => { expect(migrateSettings({ locale: 'ja', setupCompleted: true }).locale).toBe('ja'); expect(() => migrateSettings({ schemaVersion: 2 })).toThrow(); });
  it('falls back for invalid locale, labels and activity data', () => { const migrated = migrateSettings({ schemaVersion: 1, locale: 'fr', moodLabels: { 1: '', 2: 'x'.repeat(31) }, activities: [{ label: 'Missing id' }] }); expect(migrated.locale).toBe('en'); expect(migrated.moodLabels[1]).toBe('Awful'); expect(migrated.activities.length).toBeGreaterThan(0); });
  it('normalizes valid legacy activity fields', () => { const migrated = migrateSettings({ locale: 'ja', activities: [{ id: 'parent', parentId: null, label: ' 全角　 空白 ', hidden: false, usageCount: 3, lastUsedAt: '2026-07-20T00:00:00.000Z' }] }); expect(migrated.activities[0]).toMatchObject({ id: 'parent', label: '全角 空白', slug: '全角-空白' }); expect(migrated.activities[0]).not.toHaveProperty('usageCount'); expect(migrated.activities[0]).not.toHaveProperty('lastUsedAt'); });
  it('uses safe defaults for invalid daily note and mood values', () => { const migrated = migrateSettings({ dailyNote: { mode: 'unknown', manual: { folder: 1, format: '', templatePath: 1 } }, moodLabels: { 3: 'valid' } }); expect(migrated.dailyNote.mode).toBe('manual'); expect(migrated.dailyNote.manual.format).toBe('YYYY-MM-DD'); expect(migrated.moodLabels[3]).toBe('valid'); });
  it('parses normal core Daily notes configs including omitted defaults', () => { expect(parseCoreDailyNoteSettings('{"folder":"01_日次"}')).toEqual({ folder: '01_日次', format: 'YYYY-MM-DD', templatePath: null }); expect(parseCoreDailyNoteSettings('{"folder":"Daily","format":"YYYY/MM/DD","template":"Templates/Daily"}')).toEqual({ folder: 'Daily', format: 'YYYY/MM/DD', templatePath: 'Templates/Daily' }); });
  it('rejects invalid core Daily notes JSON and field types', () => { expect(() => parseCoreDailyNoteSettings('{')).toThrow(); expect(() => parseCoreDailyNoteSettings('{"folder":false}')).toThrow(); expect(() => parseCoreDailyNoteSettings('{"format":""}')).toThrow(); });
});

describe('journal draft', () => {
  const clean = { moodScore: null, activityIds: [], memo: '', dateTimeMode: 'auto' as const, manualDate: '', manualTime: '' };
  it('identifies every dirty input state', () => { expect(isDraftDirty(clean)).toBe(false); expect(isDraftDirty({ ...clean, moodScore: 3 })).toBe(true); expect(isDraftDirty({ ...clean, activityIds: ['tag'] })).toBe(true); expect(isDraftDirty({ ...clean, memo: 'note' })).toBe(true); expect(isDraftDirty({ ...clean, dateTimeMode: 'manual' })).toBe(true); });
});
