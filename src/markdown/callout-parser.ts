import type { MoodScore, ParsedMoodLog } from '../types';
import { isMoodScore } from '../domain/mood';

const ISO_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:Z|[+-]\d{2}:\d{2})$/u;
export function parseMoodLogs(lines: readonly string[]): ParsedMoodLog[] {
  const logs: ParsedMoodLog[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^> \[!mood-log\][+-]?(?: .*)?$/u.test(lines[index] ?? '')) continue;
    const start = index; while (index + 1 < lines.length && /^>/u.test(lines[index + 1] ?? '')) index += 1;
    const block = lines.slice(start, index + 1).join('\n');
    const ids = [...block.matchAll(/> <!-- mood-log-id: (.+) -->/gu)].map((m) => m[1] ?? '');
    const scores = [...block.matchAll(/> <!-- mood-score: ([1-5]) -->/gu)].map((m) => Number(m[1]));
    if (ids.length === 1 && scores.length === 1 && ISO_OFFSET.test(ids[0] ?? '') && !Number.isNaN(Date.parse(ids[0] ?? '')) && isMoodScore(scores[0])) logs.push({ start, end: index, id: ids[0] as string, occurredAt: ids[0] as string, score: scores[0] as MoodScore });
  }
  return logs;
}
