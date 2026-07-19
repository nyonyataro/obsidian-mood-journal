import type { ManualDailyNoteSettings } from '../types';

const object = (value: unknown): Record<string, unknown> | null => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
export function parseCoreDailyNoteSettings(raw: string): ManualDailyNoteSettings {
  const data = object(JSON.parse(raw)); if (data === null) throw new Error('invalid'); const folder = data.folder; const format = data.format; const template = data.template;
  if (folder !== undefined && typeof folder !== 'string') throw new Error('invalid folder');
  if (format !== undefined && (typeof format !== 'string' || !format.trim())) throw new Error('invalid format');
  if (template !== undefined && typeof template !== 'string') throw new Error('invalid template');
  return { folder: typeof folder === 'string' ? folder : '', format: typeof format === 'string' ? format : 'YYYY-MM-DD', templatePath: typeof template === 'string' && template ? template : null };
}
