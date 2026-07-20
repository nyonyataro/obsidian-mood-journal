import { Notice, Plugin } from 'obsidian';
import type { MoodJournalSettings } from './types';
import { SerializedSettingsStore } from './settings/settings-store';
import { CoreDailyNoteConfigReader } from './services/daily-note-config-reader';
import { DailyNoteService } from './services/daily-note-service';
import { JournalService } from './services/journal-service';
import { JournalEntryModal } from './ui/journal-entry-modal';
import { SetupWizardModal } from './ui/setup-wizard-modal';
import { MoodJournalSettingTab } from './ui/settings-tab';
import { t } from './i18n';

export default class MoodJournalPlugin extends Plugin {
  moodSettings!: MoodJournalSettings;
  journalService!: JournalService;
  private store!: SerializedSettingsStore;
  private settingsSaveTimer: number | null = null;
  override async onload(): Promise<void> {
    this.store = new SerializedSettingsStore(this); this.moodSettings = await this.store.load();
    const daily = new DailyNoteService(this.app, async () => this.moodSettings.dailyNote.mode === 'manual' ? this.moodSettings.dailyNote.manual : new CoreDailyNoteConfigReader(this.app.vault).readCoreSettings()); this.journalService = new JournalService(daily, () => this.moodSettings);
    this.addRibbonIcon('smile', 'Mood Journal', () => this.openJournalEntryModal()); this.addCommand({ id: 'open-journal-entry', name: 'Open journal entry', callback: () => this.openJournalEntryModal() }); this.addSettingTab(new MoodJournalSettingTab(this)); this.app.workspace.onLayoutReady(() => { if (!this.moodSettings.setupCompleted) new SetupWizardModal(this).open(); });
  }
  openJournalEntryModal(): void { if (!this.moodSettings.setupCompleted) this.openSetupWizard(); else new JournalEntryModal(this).open(); }
  openSetupWizard(): void { new SetupWizardModal(this).open(); }
  async saveSettings(): Promise<void> { await this.store.save(this.moodSettings); }
  scheduleSettingsSave(): void { if (this.settingsSaveTimer !== null) window.clearTimeout(this.settingsSaveTimer); this.settingsSaveTimer = window.setTimeout(() => { this.settingsSaveTimer = null; void this.saveSettings().catch(() => new Notice(t(this.moodSettings.locale, 'settings.invalidValue'))); }, 250); }
  override onunload(): void { if (this.settingsSaveTimer !== null) { window.clearTimeout(this.settingsSaveTimer); this.settingsSaveTimer = null; void this.saveSettings().catch((cause) => console.error('[mood-journal] settings save failed during unload', cause)); } }
}
