import { Modal, Notice, TFile, moment } from 'obsidian';
import type MoodJournalPlugin from '../main';
import type { Locale, LocalePreference, ManualDailyNoteSettings } from '../types';
import { isLocalePreference, resolveLocale, t } from '../i18n';
import { journalHeading, journalRoot } from '../markdown/journal-locale';
import { defaultSettings } from '../settings/defaults';
import { CoreDailyNoteConfigReader } from '../services/daily-note-config-reader';
import { generateDailyNotePath } from '../services/daily-note-path';
import { MobileModalViewport } from './mobile-modal-viewport';

export class SetupWizardModal extends Modal {
  private page = 1;
  private localePreference: LocalePreference;
  private followCore = false;
  private folder = '';
  private format = 'YYYY-MM-DD';
  private templatePath = '';
  private coreSettings: ManualDailyNoteSettings | null = null;
  private coreChecked = false;
  private error = '';
  private saving = false;
  private readonly mobileViewport: MobileModalViewport;

  private get locale(): Locale { return resolveLocale(this.localePreference); }

  constructor(private readonly plugin: MoodJournalPlugin) {
    super(plugin.app);
    this.localePreference = isLocalePreference(plugin.moodSettings.locale) ? plugin.moodSettings.locale : 'auto';
    this.folder = plugin.moodSettings.dailyNote.manual.folder;
    this.format = plugin.moodSettings.dailyNote.manual.format;
    this.templatePath = plugin.moodSettings.dailyNote.manual.templatePath ?? '';
    this.mobileViewport = new MobileModalViewport(this.modalEl, this.contentEl);
  }

  override onOpen(): void { this.modalEl.addClass('mood-journal-dialog'); this.setTitle(t(this.locale, 'setup.title')); void this.loadCoreSettings(); this.render(); this.mobileViewport.attach(); }
  override onClose(): void { this.mobileViewport.detach(); this.contentEl.empty(); }
  private async loadCoreSettings(): Promise<void> {
    try { this.coreSettings = await new CoreDailyNoteConfigReader(this.plugin.app.vault).readCoreSettings(); this.followCore = true; }
    catch { this.followCore = false; }
    finally { this.coreChecked = true; if (this.modalEl.isConnected) this.render(); }
  }
  private preview(settings: ManualDailyNoteSettings): string { try { return generateDailyNotePath(settings, (format) => moment.default().format(format)); } catch { return '—'; } }
  private input(parent: HTMLElement, value: string, placeholder: string, update: (value: string) => void): void { const field = parent.createEl('input', { attr: { value, placeholder } }); field.oninput = () => update(field.value); }
  private render(): void {
    const el = this.contentEl; el.empty(); el.addClass('mood-journal-modal'); this.setTitle(t(this.locale, 'setup.title')); const body = el.createDiv({ cls: 'mood-journal-modal-body' });
    if (this.page === 1) {
      body.createEl('p', { text: t(this.locale, 'setup.language') });
      for (const preference of ['auto', 'ja', 'en'] as LocalePreference[]) { const selected = this.localePreference === preference; const label = preference === 'auto' ? t(this.locale, 'language.auto') : preference === 'ja' ? t(this.locale, 'language.japanese') : t(this.locale, 'language.english'); const button = body.createEl('button', { text: `${selected ? '✓ ' : ''}${label}`, cls: 'mood-journal-choice' }); button.setAttribute('aria-pressed', String(selected)); button.onclick = () => { this.localePreference = preference; this.render(); }; }
    } else if (this.page === 2) {
      body.createEl('p', { text: t(this.locale, 'setup.daily') });
      if (!this.coreChecked) body.createEl('p', { text: t(this.locale, 'setup.checking') });
      if (this.coreSettings !== null) body.createEl('p', { text: `${t(this.locale, 'setup.detected')}: ${this.coreSettings.folder || t(this.locale, 'setup.vaultRoot')} / ${this.coreSettings.format}` });
      for (const mode of [true, false]) { const selected = this.followCore === mode; const button = body.createEl('button', { text: `${selected ? '✓ ' : ''}${t(this.locale, mode ? 'setup.follow' : 'setup.manual')}`, cls: 'mood-journal-choice' }); button.disabled = mode && this.coreSettings === null; button.setAttribute('aria-pressed', String(selected)); button.onclick = () => { this.followCore = mode; this.render(); }; }
      if (!this.followCore) {
        this.input(body, this.folder, t(this.locale, 'setup.folder'), (value) => { this.folder = value; });
        this.input(body, this.format, t(this.locale, 'setup.format'), (value) => { this.format = value; });
        this.input(body, this.templatePath, t(this.locale, 'setup.template'), (value) => { this.templatePath = value; });
      }
      const previewSettings = this.followCore && this.coreSettings !== null ? this.coreSettings : { folder: this.folder, format: this.format, templatePath: this.templatePath || null };
      body.createEl('p', { text: `${t(this.locale, 'setup.preview')}: ${this.preview(previewSettings)}` });
    } else {
      const settings = defaultSettings(this.localePreference, this.locale); const daily = this.followCore && this.coreSettings !== null ? this.coreSettings : { folder: this.folder, format: this.format, templatePath: this.templatePath || null };
      body.createEl('p', { text: `${t(this.locale, 'setup.preview')}: ${this.preview(daily)}` });
      body.createEl('p', { text: `${t(this.locale, 'setup.initialTags')}: ${settings.activities.map((activity) => activity.label).join(', ')}` });
      body.createEl('p', { text: t(this.locale, 'setup.saveExample') }); body.createEl('pre', { text: `${journalHeading(this.locale)}\n\n> [!mood-log] 12:00 🙂\n> ${journalRoot(this.locale)}` });
    }
    if (this.error) body.createDiv({ text: this.error, cls: 'mood-journal-error', attr: { role: 'alert' } });
    const footer = el.createDiv({ cls: 'mood-journal-footer' }); if (this.page > 1) footer.createEl('button', { text: t(this.locale, 'setup.back') }).onclick = () => { this.page -= 1; this.render(); };
    const next = footer.createEl('button', { text: this.saving ? t(this.locale, 'entry.saving') : this.page === 3 ? t(this.locale, 'setup.finish') : t(this.locale, 'setup.next'), cls: 'mod-cta' }); next.disabled = this.saving; next.onclick = () => void this.advance();
    this.mobileViewport.refresh();
  }
  private async advance(): Promise<void> {
    if (this.saving) return;
    this.error = '';
    if (this.page === 2 && !this.followCore) {
      if (!this.format.trim()) { this.error = t(this.locale, 'error.formatRequired'); this.render(); return; }
      if (this.templatePath.trim()) { const target = this.plugin.app.metadataCache.getFirstLinkpathDest(this.templatePath, '') ?? this.plugin.app.vault.getAbstractFileByPath(this.templatePath.endsWith('.md') ? this.templatePath : `${this.templatePath}.md`); if (!(target instanceof TFile)) { this.error = t(this.locale, 'error.templateMissing'); this.render(); return; } }
    }
    if (this.page < 3) { this.page += 1; this.render(); return; }
    const settings = defaultSettings(this.localePreference, this.locale); settings.setupCompleted = true; settings.dailyNote.mode = this.followCore ? 'follow-core' : 'manual'; settings.dailyNote.manual = { folder: this.folder, format: this.format, templatePath: this.templatePath || null }; settings.activities = this.plugin.moodSettings.activities;
    const previousSettings = this.plugin.moodSettings;
    this.saving = true; this.render();
    try { this.plugin.moodSettings = settings; await this.plugin.saveSettings(); this.close(); new Notice(t(this.locale, 'notice.saved')); }
    catch { this.plugin.moodSettings = previousSettings; this.error = t(this.locale, 'setup.saveError'); }
    finally { this.saving = false; if (this.modalEl.isConnected) this.render(); }
  }
}
