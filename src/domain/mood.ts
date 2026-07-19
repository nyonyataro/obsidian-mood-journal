import type { MoodScore } from '../types';

export const MOODS: Readonly<Record<MoodScore, string>> = { 1: '😫', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
export const LABELS = { ja: { 1: '最悪', 2: '悪い', 3: '普通', 4: '良い', 5: '最高' }, en: { 1: 'Awful', 2: 'Bad', 3: 'Okay', 4: 'Good', 5: 'Great' } } as const;
export function isMoodScore(value: unknown): value is MoodScore { return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5; }
