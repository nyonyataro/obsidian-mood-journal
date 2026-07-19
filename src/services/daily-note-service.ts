import { TFile, TFolder, moment, type App } from 'obsidian';
import type { JournalEntry, ManualDailyNoteSettings } from '../types';
import { insertJournalEntry, DuplicateJournalHeadingError } from '../markdown/journal-inserter';
import { generateDailyNotePath } from './daily-note-path';
import { renderTemplate } from './template-renderer';
import { MoodJournalError } from '../utils/errors';
import { parseMoodLogs } from '../markdown/callout-parser';
import { toOffsetIso, uniqueEntryDate } from '../utils/datetime';
type MomentFormatter = (value: string) => { format(pattern: string): string };
const formatWithMoment = (value: string, pattern: string): string => {
  const candidate: unknown = moment;
  if (typeof candidate === 'function') return (candidate as MomentFormatter)(value).format(pattern);
  if (typeof candidate === 'object' && candidate !== null && 'default' in candidate && typeof candidate.default === 'function') return (candidate.default as MomentFormatter)(value).format(pattern);
  throw new Error('Obsidian moment API is unavailable');
};

export class DailyNoteService {
  constructor(private readonly app: App, private readonly resolve: () => Promise<ManualDailyNoteSettings>) {}
  async getTargetPath(occurredAt: string): Promise<string> { const settings = await this.resolve(); try { return generateDailyNotePath(settings, (format) => formatWithMoment(occurredAt, format)); } catch (cause) { throw new MoodJournalError('INVALID_DAILY_NOTE_PATH', 'error.invalidPath', {}, { cause }); } }
  async writeEntry(entry: JournalEntry): Promise<TFile> {
    const settings = await this.resolve(); const path = await this.getTargetPath(entry.occurredAt); const current = this.app.vault.getAbstractFileByPath(path);
    if (current instanceof TFolder) throw new MoodJournalError('DAILY_NOTE_PATH_IS_FOLDER', 'error.pathFolder', { path });
    if (current instanceof TFile) return this.update(current, entry);
    await this.ensureFolders(path);
    const template = await this.template(settings.templatePath, entry.occurredAt, path);
    try { return await this.app.vault.create(path, insertJournalEntry(template, this.withUniqueId(template, entry))); } catch (cause) { const raced = this.app.vault.getAbstractFileByPath(path); if (raced instanceof TFile) return this.update(raced, entry); throw new MoodJournalError('FILE_CREATE_FAILED', 'error.createFailed', { path }, { cause }); }
  }
  private async update(file: TFile, entry: JournalEntry): Promise<TFile> { try { await this.app.vault.process(file, (content) => insertJournalEntry(content, this.withUniqueId(content, entry))); return file; } catch (cause) { if (cause instanceof DuplicateJournalHeadingError) throw new MoodJournalError('DUPLICATE_JOURNAL_HEADING', 'error.duplicateHeading', { path: file.path }, { cause }); throw new MoodJournalError('FILE_UPDATE_FAILED', 'error.updateFailed', { path: file.path }, { cause }); } }
  private withUniqueId(content: string, entry: JournalEntry): JournalEntry { const ids = parseMoodLogs(content.split(/\r\n|\n/u)).map((log) => log.id); const occurredAt = toOffsetIso(uniqueEntryDate(new Date(entry.occurredAt), ids)); return occurredAt === entry.id ? entry : { ...entry, id: occurredAt, occurredAt }; }
  private async ensureFolders(path: string): Promise<void> { const segments = path.split('/'); segments.pop(); let current = ''; for (const segment of segments) { current = current ? `${current}/${segment}` : segment; const existing = this.app.vault.getAbstractFileByPath(current); if (existing instanceof TFile) throw new MoodJournalError('PARENT_PATH_IS_FILE', 'error.parentFile', { path: current }); if (existing === null) try { await this.app.vault.createFolder(current); } catch { if (!(this.app.vault.getAbstractFileByPath(current) instanceof TFolder)) throw new MoodJournalError('FILE_CREATE_FAILED', 'error.folderCreateFailed', { path: current }); } } }
  private async template(templatePath: string | null, occurredAt: string, outputPath: string): Promise<string> { if (templatePath === null) return ''; const target = this.app.metadataCache.getFirstLinkpathDest(templatePath, '') ?? this.app.vault.getAbstractFileByPath(templatePath.endsWith('.md') ? templatePath : `${templatePath}.md`); if (!(target instanceof TFile)) throw new MoodJournalError('TEMPLATE_NOT_FOUND', 'error.templateMissing', { path: templatePath }); try { const title = outputPath.split('/').pop()?.replace(/\.md$/u, '') ?? ''; return renderTemplate(await this.app.vault.read(target), title, (format) => formatWithMoment(occurredAt, format)); } catch (cause) { throw new MoodJournalError('TEMPLATE_READ_FAILED', 'error.templateReadFailed', { path: templatePath }, { cause }); } }
}
