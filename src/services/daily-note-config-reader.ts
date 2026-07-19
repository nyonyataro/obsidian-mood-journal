import type { Vault } from 'obsidian';
import type { ManualDailyNoteSettings } from '../types';
import { MoodJournalError } from '../utils/errors';
import { parseCoreDailyNoteSettings } from './daily-note-config-parser';
export class CoreDailyNoteConfigReader {
  constructor(private readonly vault: Vault) {}
  async readCoreSettings(): Promise<ManualDailyNoteSettings> { const path = `${this.vault.configDir}/daily-notes.json`; let raw: string; try { raw = await this.vault.adapter.read(path); } catch (cause) { throw new MoodJournalError('CORE_DAILY_NOTE_CONFIG_NOT_FOUND', 'error.coreConfigMissing', {}, { cause }); } try { return parseCoreDailyNoteSettings(raw); } catch (cause) { throw new MoodJournalError('CORE_DAILY_NOTE_CONFIG_INVALID', 'error.coreConfigInvalid', {}, { cause }); } }
}
