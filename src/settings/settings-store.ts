import type { Plugin } from 'obsidian';
import type { MoodJournalSettings } from '../types';
import { migrateSettings } from './migration';

export class SerializedSettingsStore {
  private chain: Promise<void> = Promise.resolve();
  constructor(private readonly plugin: Plugin) {}
  async load(): Promise<MoodJournalSettings> { return migrateSettings(await this.plugin.loadData()); }
  async save(settings: MoodJournalSettings): Promise<void> { this.chain = this.chain.then(() => this.plugin.saveData(settings)); return this.chain; }
}
