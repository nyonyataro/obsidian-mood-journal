import type { Plugin } from 'obsidian';
import type { MoodJournalSettings } from '../types';
import { migrateSettings } from './migration';

const snapshotSettings = (settings: MoodJournalSettings): MoodJournalSettings =>
  JSON.parse(JSON.stringify(settings)) as MoodJournalSettings;

export class SerializedSettingsStore {
  private chain: Promise<void> = Promise.resolve();
  constructor(private readonly plugin: Plugin) {}
  async load(): Promise<MoodJournalSettings> { return migrateSettings(await this.plugin.loadData()); }
  async save(settings: MoodJournalSettings): Promise<void> {
    const snapshot = snapshotSettings(settings);
    const operation = this.chain.then(() => this.plugin.saveData(snapshot));
    this.chain = operation.catch(() => undefined);
    return operation;
  }
}
