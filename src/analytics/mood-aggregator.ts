import type { DailyMoodSummary, MoodDashboardModel, MoodDashboardRange, MoodLogRecord, MoodScore } from '../types';

const RANGE_DAYS: Record<Exclude<MoodDashboardRange, 'all'>, number> = { '30d': 30, '90d': 90 };
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/u;
const SCORES: MoodScore[] = [1, 2, 3, 4, 5];

function pad(value: number): string { return String(value).padStart(2, '0'); }

export function currentDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return currentDateKey(date);
}

function dateKeysBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (let dateKey = startDate; dateKey <= endDate; dateKey = addDays(dateKey, 1)) dates.push(dateKey);
  return dates;
}

function emptyDistribution(): Record<MoodScore, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function roundAverage(total: number, count: number): number | null {
  return count === 0 ? null : total / count;
}

export function aggregateMoodRecords(records: readonly MoodLogRecord[], range: MoodDashboardRange, todayKey = currentDateKey()): MoodDashboardModel {
  const recordDates = records.map((record) => record.occurredAt.slice(0, 10)).filter((dateKey) => DATE_KEY.test(dateKey)).sort();
  const allStart = recordDates[0] ?? null;
  const allEnd = recordDates[recordDates.length - 1] ?? null;
  const startDate = range === 'all' ? allStart : addDays(todayKey, -(RANGE_DAYS[range] - 1));
  const endDate = range === 'all' ? allEnd : todayKey;
  const filtered = records.filter((record) => {
    const dateKey = record.occurredAt.slice(0, 10);
    return startDate !== null && endDate !== null && dateKey >= startDate && dateKey <= endDate;
  });
  const byDate = new Map<string, MoodLogRecord[]>();
  const distribution = emptyDistribution();
  const idCounts = new Map<string, number>();
  let totalScore = 0;
  for (const record of filtered) {
    const dateKey = record.occurredAt.slice(0, 10);
    const dayRecords = byDate.get(dateKey) ?? [];
    dayRecords.push(record);
    byDate.set(dateKey, dayRecords);
    distribution[record.score] += 1;
    totalScore += record.score;
    idCounts.set(record.id, (idCounts.get(record.id) ?? 0) + 1);
  }
  const daily: DailyMoodSummary[] = startDate !== null && endDate !== null
    ? dateKeysBetween(startDate, endDate).map((dateKey) => {
        const dayRecords = byDate.get(dateKey) ?? [];
        const scoreTotal = dayRecords.reduce((sum, record) => sum + record.score, 0);
        return {
          dateKey,
          averageScore: roundAverage(scoreTotal, dayRecords.length),
          entryCount: dayRecords.length,
          sourcePaths: [...new Set(dayRecords.map((record) => record.source.path))],
        };
      })
    : [];
  return {
    range,
    startDate,
    endDate,
    daily,
    averageScore: roundAverage(totalScore, filtered.length),
    totalRecords: filtered.length,
    recordDays: byDate.size,
    distribution,
    duplicateIds: [...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  };
}

export function moodScores(): readonly MoodScore[] { return SCORES; }
