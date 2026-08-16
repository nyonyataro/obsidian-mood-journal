import type { Vault } from 'obsidian';
import { isMoodScore } from '../domain/mood';
import type { MoodLogRecord } from '../types';

const ISO_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:Z|[+-]\d{2}:\d{2})$/u;
const MOOD_CALLOUT = /^> \[!mood-log\][+-]?(?: .*)?$/u;
const FENCE = /^\s{0,3}(`{3,}|~{3,})(.*)$/u;
const ID_METADATA = /^> <!-- mood-log-id: (.*?) -->$/u;
const SCORE_METADATA = /^> <!-- mood-score: (.*?) -->$/u;

interface FenceState {
  character: '`' | '~';
  length: number;
}

function getFence(line: string): { marker: string; rest: string } | null {
  const match = FENCE.exec(line);
  if (match === null || match[1] === undefined) return null;
  return { marker: match[1], rest: match[2] ?? '' };
}

function isFenceClose(fence: FenceState, marker: string, rest: string): boolean {
  return marker[0] === fence.character && marker.length >= fence.length && rest.trim().length === 0;
}

function isValidOccurredAt(value: string): boolean {
  return ISO_OFFSET.test(value) && !Number.isNaN(Date.parse(value));
}

function scanBlock(lines: readonly string[], start: number, end: number, sourcePath: string): MoodLogRecord | null {
  const ids: string[] = [];
  const scores: string[] = [];
  for (const line of lines.slice(start, end)) {
    const id = ID_METADATA.exec(line)?.[1];
    if (id !== undefined) ids.push(id);
    const score = SCORE_METADATA.exec(line)?.[1];
    if (score !== undefined) scores.push(score);
  }
  const id = ids.length === 1 ? ids[0] : undefined;
  const rawScore = scores.length === 1 ? scores[0] : undefined;
  const score = rawScore === undefined ? undefined : Number(rawScore);
  if (id === undefined || rawScore === undefined || !isValidOccurredAt(id) || !isMoodScore(score)) return null;
  return { id, occurredAt: id, score, source: { path: sourcePath, startLine: start, endLine: end } };
}

export function scanMoodLogsFromMarkdown(content: string, sourcePath: string): MoodLogRecord[] {
  const lines = content.split(/\r\n|\n|\r/u);
  const records: MoodLogRecord[] = [];
  let fence: FenceState | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const fenceLine = getFence(lines[index] ?? '');
    if (fenceLine !== null) {
      if (fence !== null) {
        if (isFenceClose(fence, fenceLine.marker, fenceLine.rest)) fence = null;
      } else {
        const character = fenceLine.marker[0];
        if (character === '`' || character === '~') fence = { character, length: fenceLine.marker.length };
      }
      continue;
    }
    if (fence !== null || !MOOD_CALLOUT.test(lines[index] ?? '')) continue;

    const start = index;
    let end = start + 1;
    while (end < lines.length && /^>/u.test(lines[end] ?? '')) end += 1;
    const record = scanBlock(lines, start, end, sourcePath);
    if (record !== null) records.push(record);
    index = end - 1;
  }
  return records;
}

export class MoodLogScanner {
  constructor(private readonly vault: Vault) {}

  async scan(): Promise<MoodLogRecord[]> {
    const records: MoodLogRecord[] = [];
    for (const file of this.vault.getMarkdownFiles()) {
      const content = await this.vault.cachedRead(file);
      if (!content.includes('mood-log-id:')) continue;
      records.push(...scanMoodLogsFromMarkdown(content, file.path));
    }
    return records.sort((left, right) => left.source.path.localeCompare(right.source.path) || left.source.startLine - right.source.startLine);
  }
}
