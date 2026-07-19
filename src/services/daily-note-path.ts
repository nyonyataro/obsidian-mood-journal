import type { ManualDailyNoteSettings } from '../types';

export type DateFormatter = (format: string) => string;
export function generateDailyNotePath(settings: ManualDailyNoteSettings, formatDate: DateFormatter): string {
  const rawFolder = settings.folder.trim().replace(/\\/gu, '/');
  const folder = rawFolder.replace(/^\/+|\/+$/gu, '');
  const base = formatDate(settings.format).replace(/\\/gu, '/').replace(/\.md$/iu, '');
  if (!base || /(^|\/)\.\.(?:\/|$)/u.test(base) || /(^|\/)\.\.(?:\/|$)/u.test(folder) || /^[/\\]|^[A-Za-z]:/u.test(base) || /^[/\\]|^[A-Za-z]:/u.test(rawFolder)) throw new Error('invalid daily note path');
  const result = (folder ? `${folder}/${base}.md` : `${base}.md`).replace(/\/{2,}/gu, '/');
  if (!result || result === '.md') throw new Error('invalid daily note path');
  return result;
}
