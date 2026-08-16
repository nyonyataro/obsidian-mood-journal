import { Notice, Plugin } from 'obsidian';
import type { Locale, MoodJournalSettings } from './types';
import { SerializedSettingsStore } from './settings/settings-store';
import { CoreDailyNoteConfigReader } from './services/daily-note-config-reader';
import { DailyNoteService } from './services/daily-note-service';
import { JournalService } from './services/journal-service';
import { JournalEntryModal } from './ui/journal-entry-modal';
import { SetupWizardModal } from './ui/setup-wizard-modal';
import { MoodJournalSettingTab } from './ui/settings-tab';
import { MoodDashboardView, VIEW_TYPE_MOOD_DASHBOARD } from './ui/mood-dashboard-view';
import { MoodLogScanner } from './analytics/mood-log-scanner';
import { resolveLocale, t } from './i18n';

export default class MoodJournalPlugin extends Plugin {
  moodSettings!: MoodJournalSettings;
  journalService!: JournalService;
  private store!: SerializedSettingsStore;
  private settingsSaveTimer: number | null = null;
  get locale(): Locale { return resolveLocale(this.moodSettings.locale); }
  override async onload(): Promise<void> {
    this.store = new SerializedSettingsStore(this); this.moodSettings = await this.store.load();
    const daily = new DailyNoteService(this.app, async () => this.moodSettings.dailyNote.mode === 'manual' ? this.moodSettings.dailyNote.manual : new CoreDailyNoteConfigReader(this.app.vault).readCoreSettings()); this.journalService = new JournalService(daily, () => this.moodSettings, () => this.locale);
    const scanner = new MoodLogScanner(this.app.vault);
    this.registerView(VIEW_TYPE_MOOD_DASHBOARD, (leaf) => new MoodDashboardView(leaf, scanner, () => this.locale));
    this.registerEvent(this.app.vault.on('create', () => this.markDashboardViewsDirty()));
    this.registerEvent(this.app.vault.on('modify', () => this.markDashboardViewsDirty()));
    this.registerEvent(this.app.vault.on('delete', () => this.markDashboardViewsDirty()));
    this.registerEvent(this.app.vault.on('rename', () => this.markDashboardViewsDirty()));
    this.addRibbonIcon('smile', 'Mood Journal', () => this.openJournalEntryModal());
    this.addRibbonIcon('bar-chart-2', t(this.locale, 'dashboard.open'), () => void this.openMoodDashboard());
    this.addCommand({ id: 'open-journal-entry', name: 'Open journal entry', callback: () => this.openJournalEntryModal() });
    this.addCommand({ id: 'open-mood-dashboard', name: t(this.locale, 'dashboard.open'), callback: () => void this.openMoodDashboard() });
    this.addSettingTab(new MoodJournalSettingTab(this)); this.app.workspace.onLayoutReady(() => { if (!this.moodSettings.setupCompleted) new SetupWizardModal(this).open(); });
  }
  openJournalEntryModal(): void { if (!this.moodSettings.setupCompleted) this.openSetupWizard(); else new JournalEntryModal(this).open(); }
  openSetupWizard(): void { new SetupWizardModal(this).open(); }
  async openMoodDashboard(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_MOOD_DASHBOARD)[0];
    const leaf = existing ?? this.app.workspace.getRightLeaf(false);
    if (leaf === null || leaf === undefined) {
      new Notice(t(this.locale, 'dashboard.error'));
      return;
    }
    await leaf.setViewState({ type: VIEW_TYPE_MOOD_DASHBOARD, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }
  markDashboardViewsDirty(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_MOOD_DASHBOARD)) {
      const view = leaf.view;
      if (view instanceof MoodDashboardView) view.markDirty();
    }
  }
  async saveSettings(): Promise<void> { await this.store.save(this.moodSettings); }
  scheduleSettingsSave(): void { if (this.settingsSaveTimer !== null) window.clearTimeout(this.settingsSaveTimer); this.settingsSaveTimer = window.setTimeout(() => { this.settingsSaveTimer = null; void this.saveSettings().catch(() => new Notice(t(this.locale, 'settings.invalidValue'))); }, 250); }
  override onunload(): void { if (this.settingsSaveTimer !== null) { window.clearTimeout(this.settingsSaveTimer); this.settingsSaveTimer = null; void this.saveSettings().catch((cause) => console.error('[mood-journal] settings save failed during unload', cause)); } }
}
