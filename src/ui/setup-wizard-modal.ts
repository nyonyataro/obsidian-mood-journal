import { AbstractInputSuggest, Modal, Notice, TFile, TFolder, moment } from 'obsidian';
import type MoodJournalPlugin from '../main';
import type { Locale, ManualDailyNoteSettings } from '../types';
import { t } from '../i18n';
import { defaultSettings } from '../settings/defaults';
import { CoreDailyNoteConfigReader } from '../services/daily-note-config-reader';
import { generateDailyNotePath } from '../services/daily-note-path';

class SetupPathSuggest extends AbstractInputSuggest<string> {
  constructor(plugin: MoodJournalPlugin, private readonly input: HTMLInputElement, private readonly values: () => string[]) { super(plugin.app, input); }
  protected getSuggestions(query: string): string[] { return this.values().filter((value) => value.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 30); }
  renderSuggestion(value: string, el: HTMLElement): void { el.setText(value); }
  override selectSuggestion(value: string): void { this.setValue(value); this.input.dispatchEvent(new Event('input', { bubbles: true })); }
}

export class SetupWizardModal extends Modal {
  private page = 1;
  private locale: Locale;
  private followCore = false;
  private folder = '';
  private format = 'YYYY-MM-DD';
  private templatePath = '';
  private coreSettings: ManualDailyNoteSettings | null = null;
  private coreChecked = false;
  private error = '';

  constructor(private readonly plugin: MoodJournalPlugin) {
    super(plugin.app);
    this.locale = plugin.moodSettings.locale ?? (navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en');
    this.folder = plugin.moodSettings.dailyNote.manual.folder;
    this.format = plugin.moodSettings.dailyNote.manual.format;
    this.templatePath = plugin.moodSettings.dailyNote.manual.templatePath ?? '';
  }

  override onOpen(): void { this.modalEl.addClass('mood-journal-dialog'); void this.loadCoreSettings(); this.render(); }
  private async loadCoreSettings(): Promise<void> {
    try { this.coreSettings = await new CoreDailyNoteConfigReader(this.plugin.app.vault).readCoreSettings(); this.followCore = true; }
    catch { this.followCore = false; }
    finally { this.coreChecked = true; if (this.modalEl.isConnected) this.render(); }
  }
  private folderPaths(): string[] { return this.plugin.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder).map((folder) => folder.path).filter(Boolean); }
  private templatePaths(): string[] { return this.plugin.app.vault.getAllLoadedFiles().filter((file): file is TFile => file instanceof TFile && file.extension === 'md').map((file) => file.path); }
  private preview(settings: ManualDailyNoteSettings): string { try { return generateDailyNotePath(settings, (format) => moment.default().format(format)); } catch { return '—'; } }
  private input(parent: HTMLElement, value: string, placeholder: string, update: (value: string) => void, suggestions?: () => string[]): void {
    const field = parent.createEl('input', { attr: { value, placeholder } }); field.oninput = () => update(field.value); if (suggestions !== undefined) new SetupPathSuggest(this.plugin, field, suggestions);
  }
  private render(): void {
    const el = this.contentEl; el.empty(); el.addClass('mood-journal-modal'); el.createEl('h2', { text: t(this.locale, 'setup.title') });
    if (this.page === 1) {
      el.createEl('p', { text: t(this.locale, 'setup.language') });
      for (const locale of ['ja', 'en'] as Locale[]) { const selected = this.locale === locale; const button = el.createEl('button', { text: `${selected ? '✓ ' : ''}${locale === 'ja' ? '日本語' : 'English'}`, cls: 'mood-journal-choice' }); button.setAttribute('aria-pressed', String(selected)); button.onclick = () => { this.locale = locale; this.render(); }; }
    } else if (this.page === 2) {
      el.createEl('p', { text: t(this.locale, 'setup.daily') });
      if (!this.coreChecked) el.createEl('p', { text: t(this.locale, 'setup.checking') });
      if (this.coreSettings !== null) el.createEl('p', { text: `${t(this.locale, 'setup.detected')}: ${this.coreSettings.folder || t(this.locale, 'setup.vaultRoot')} / ${this.coreSettings.format}` });
      for (const mode of [true, false]) { const selected = this.followCore === mode; const button = el.createEl('button', { text: `${selected ? '✓ ' : ''}${t(this.locale, mode ? 'setup.follow' : 'setup.manual')}`, cls: 'mood-journal-choice' }); button.disabled = mode && this.coreSettings === null; button.setAttribute('aria-pressed', String(selected)); button.onclick = () => { this.followCore = mode; this.render(); }; }
      if (!this.followCore) {
        this.input(el, this.folder, t(this.locale, 'setup.folder'), (value) => { this.folder = value; }, () => this.folderPaths());
        this.input(el, this.format, t(this.locale, 'setup.format'), (value) => { this.format = value; });
        this.input(el, this.templatePath, t(this.locale, 'setup.template'), (value) => { this.templatePath = value; }, () => this.templatePaths());
      }
      const previewSettings = this.followCore && this.coreSettings !== null ? this.coreSettings : { folder: this.folder, format: this.format, templatePath: this.templatePath || null };
      el.createEl('p', { text: `${t(this.locale, 'setup.preview')}: ${this.preview(previewSettings)}` });
    } else {
      const settings = defaultSettings(this.locale); const daily = this.followCore && this.coreSettings !== null ? this.coreSettings : { folder: this.folder, format: this.format, templatePath: this.templatePath || null };
      el.createEl('p', { text: `${t(this.locale, 'setup.preview')}: ${this.preview(daily)}` });
      el.createEl('p', { text: `${t(this.locale, 'setup.initialTags')}: ${settings.activities.map((activity) => activity.label).join(', ')}` });
      el.createEl('p', { text: t(this.locale, 'setup.saveExample') }); el.createEl('pre', { text: '> [!mood-log] 12:00 🙂\n> #日記' });
    }
    if (this.error) el.createDiv({ text: this.error, cls: 'mood-journal-error', attr: { role: 'alert' } });
    const footer = el.createDiv({ cls: 'mood-journal-footer' }); if (this.page > 1) footer.createEl('button', { text: t(this.locale, 'setup.back') }).onclick = () => { this.page -= 1; this.render(); };
    footer.createEl('button', { text: this.page === 3 ? t(this.locale, 'setup.finish') : t(this.locale, 'setup.next'), cls: 'mod-cta' }).onclick = () => void this.advance();
  }
  private async advance(): Promise<void> {
    this.error = '';
    if (this.page === 2 && !this.followCore) {
      if (!this.format.trim()) { this.error = t(this.locale, 'error.formatRequired'); this.render(); return; }
      if (this.templatePath.trim()) { const target = this.plugin.app.metadataCache.getFirstLinkpathDest(this.templatePath, '') ?? this.plugin.app.vault.getAbstractFileByPath(this.templatePath.endsWith('.md') ? this.templatePath : `${this.templatePath}.md`); if (!(target instanceof TFile)) { this.error = t(this.locale, 'error.templateMissing'); this.render(); return; } }
    }
    if (this.page < 3) { this.page += 1; this.render(); return; }
    const settings = defaultSettings(this.locale); settings.setupCompleted = true; settings.dailyNote.mode = this.followCore ? 'follow-core' : 'manual'; settings.dailyNote.manual = { folder: this.folder, format: this.format, templatePath: this.templatePath || null }; settings.activities = this.plugin.moodSettings.activities; this.plugin.moodSettings = settings; await this.plugin.saveSettings(); this.close(); new Notice(t(this.locale, 'notice.saved'));
  }
}
