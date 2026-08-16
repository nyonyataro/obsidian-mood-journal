import { describe, expect, it } from 'vitest';
import { aggregateMoodRecords } from '../src/analytics/mood-aggregator';
import { scanMoodLogsFromMarkdown } from '../src/analytics/mood-log-scanner';
import type { MoodLogRecord, MoodScore } from '../src/types';

const callout = (id: string, score: number, tag = ''): string => [
  `> [!mood-log] 10:00 🙂 Good`,
  `> ${tag}`,
  `> <!-- mood-log-id: ${id} -->`,
  `> <!-- mood-score: ${score} -->`,
].join('\n');

const record = (id: string, score: MoodScore, sourcePath = 'Daily/2026-08-16.md'): MoodLogRecord => ({
  id,
  occurredAt: id,
  score,
  source: { path: sourcePath, startLine: 0, endLine: 4 },
});

describe('MoodLogScanner', () => {
  it('adopts valid logs without requiring tags and excludes fenced samples', () => {
    const fenced = ['```md', callout('2026-08-16T09:00:00.000+09:00', 1), '```'].join('\n');
    const content = `${fenced}\n\n${callout('2026-08-16T10:00:00.000+09:00', 4)}`;
    const logs = scanMoodLogsFromMarkdown(content, 'Daily/2026-08-16.md');

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ id: '2026-08-16T10:00:00.000+09:00', score: 4 });
    expect(logs[0]?.source).toEqual({ path: 'Daily/2026-08-16.md', startLine: 7, endLine: 11 });
  });

  it('rejects malformed IDs, out-of-range scores, and duplicate metadata', () => {
    const content = [
      callout('2026-08-16T10:00:00.000', 4),
      callout('2026-08-16T11:00:00.000+09:00', 0),
      callout('2026-08-16T12:00:00.000+09:00', 6),
      `${callout('2026-08-16T13:00:00.000+09:00', 4)}\n> <!-- mood-score: 5 -->`,
      `${callout('2026-08-16T14:00:00.000+09:00', 4)}\n> <!-- mood-log-id: 2026-08-16T15:00:00.000+09:00 -->`,
    ].join('\n\n');

    expect(scanMoodLogsFromMarkdown(content, 'note.md')).toEqual([]);
  });

  it('excludes tilde-fenced content and preserves each valid duplicate ID as a record', () => {
    const fenced = ['~~~markdown', callout('2026-08-16T09:00:00.000+09:00', 1), '~~~'].join('\n');
    const content = `${fenced}\n\n${callout('2026-08-16T10:00:00.000+09:00', 4)}\n\n${callout('2026-08-16T10:00:00.000+09:00', 5)}`;
    const logs = scanMoodLogsFromMarkdown(content, 'note.md');

    expect(logs.map((log) => log.score)).toEqual([4, 5]);
  });
});

describe('MoodAggregator', () => {
  it('calculates daily averages, counts, missing days, and score distribution', () => {
    const records = [
      record('2026-08-16T10:00:00.000+09:00', 5),
      record('2026-08-16T12:00:00.000+09:00', 1, 'Other.md'),
      record('2026-08-15T23:30:00.000-02:00', 4),
    ];
    const model = aggregateMoodRecords(records, '30d', '2026-08-16');

    expect(model.daily).toHaveLength(30);
    expect(model.daily[0]?.dateKey).toBe('2026-07-18');
    expect(model.daily.at(-1)?.dateKey).toBe('2026-08-16');
    expect(model.daily.find((day) => day.dateKey === '2026-08-16')).toMatchObject({ averageScore: 3, entryCount: 2 });
    expect(model.daily.find((day) => day.dateKey === '2026-08-15')).toMatchObject({ averageScore: 4, entryCount: 1 });
    expect(model.daily.find((day) => day.dateKey === '2026-08-14')).toMatchObject({ averageScore: null, entryCount: 0 });
    expect(model.averageScore).toBe(10 / 3);
    expect(model.totalRecords).toBe(3);
    expect(model.recordDays).toBe(2);
    expect(model.distribution).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 1 });
  });

  it('uses the offset-bearing local date and does not deduplicate IDs', () => {
    const records = [
      record('2026-08-15T23:30:00.000+14:00', 4),
      record('2026-08-15T23:30:00.000+14:00', 2, 'copy.md'),
    ];
    const model = aggregateMoodRecords(records, 'all', '2026-08-16');

    expect(model.startDate).toBe('2026-08-15');
    expect(model.endDate).toBe('2026-08-15');
    expect(model.daily).toEqual([{ dateKey: '2026-08-15', averageScore: 3, entryCount: 2, sourcePaths: ['Daily/2026-08-16.md', 'copy.md'] }]);
    expect(model.duplicateIds).toEqual(['2026-08-15T23:30:00.000+14:00']);
    expect(model.totalRecords).toBe(2);
  });

  it('generates the selected 90-day window including today', () => {
    const model = aggregateMoodRecords([], '90d', '2026-08-16');

    expect(model.startDate).toBe('2026-05-19');
    expect(model.endDate).toBe('2026-08-16');
    expect(model.daily).toHaveLength(90);
    expect(model.daily.every((day) => day.averageScore === null)).toBe(true);
  });
});
