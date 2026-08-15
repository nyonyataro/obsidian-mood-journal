import type { Plugin } from 'obsidian';
import type { MoodJournalSettings } from '../types';
import { migrateSettings } from './migration';

const snapshotSettings = (settings: MoodJournalSettings): MoodJournalSettings => {
  const raw: unknown = JSON.parse(JSON.stringify(settings));
  return migrateSettings(raw);
};

export class SerializedSettingsStore {
  private chain: Promise<void> = Promise.resolve();
  constructor(private readonly plugin: Plugin) {}
  async load(): Promise<MoodJournalSettings> {
    const raw: unknown = await this.plugin.loadData();
    return migrateSettings(raw);
  }
  async save(settings: MoodJournalSettings): Promise<void> {
    const snapshot = snapshotSettings(settings);
    const operation = this.chain.then(() => this.plugin.saveData(snapshot));
    this.chain = operation.catch(() => undefined);
    return operation;
  }
}
