import { AbstractInputSuggest, Notice, PluginSettingTab, Setting, TFile, TFolder, moment } from 'obsidian';
import type MoodJournalPlugin from '../main';
import { t } from '../i18n';
import { LABELS, MOODS } from '../domain/mood';
import type { ManualDailyNoteSettings, MoodScore } from '../types';
import { ActivityService } from '../services/activity-service';
import { ActivityEditorModal } from './activity-editor-modal';
import { ConfirmModal } from './discard-confirm-modal';
import { CoreDailyNoteConfigReader } from '../services/daily-note-config-reader';
import { generateDailyNotePath } from '../services/daily-note-path';

class PathSuggest extends AbstractInputSuggest<string> {
  constructor(plugin: MoodJournalPlugin, private readonly input: HTMLInputElement, private readonly values: () => string[]) { super(plugin.app, input); }
  protected getSuggestions(query: string): string[] { const normalized = query.toLocaleLowerCase(); return this.values().filter((value) => value.toLocaleLowerCase().includes(normalized)).slice(0, 30); }
  renderSuggestion(value: string, el: HTMLElement): void { el.setText(value); }
  override selectSuggestion(value: string): void { this.setValue(value); this.input.dispatchEvent(new Event('input', { bubbles: true })); }
}

export class MoodJournalSettingTab extends PluginSettingTab {
  private coreSettings: ManualDailyNoteSettings | null = null;
  private coreError = false;
  constructor(private readonly plugin: MoodJournalPlugin) { super(plugin.app, plugin); }
  override getSettingDefinitions() {
    const locale = this.plugin.moodSettings.locale;
    return [{
      name: 'Mood Journal',
      desc: t(locale, 'settings.dailyHelp'),
      aliases: [
        t(locale, 'settings.language'),
        t(locale, 'settings.daily'),
        t(locale, 'settings.moodLabels'),
        t(locale, 'settings.tags'),
        t(locale, 'settings.setup'),
      ],
      render: (setting: Setting) => this.renderSettings(setting.settingEl),
    }];
  }
  // Obsidian versions before 1.13.0 use this imperative fallback.
  override display(): void { this.renderSettings(this.containerEl); }
  private renderSettings(containerEl: HTMLElement): void {
    const locale = this.plugin.moodSettings.locale; containerEl.empty();
    new Setting(containerEl).setName(t(locale, 'settings.language')).addDropdown((drop) => drop.addOption('ja', '日本語').addOption('en', 'English').setValue(locale).onChange(async (value) => { if (value === 'ja' || value === 'en') { this.plugin.moodSettings.locale = value; await this.plugin.saveSettings(); this.refreshSettings(); new Notice(t(value, 'notice.commandNameReload')); } }));
    this.heading(containerEl, t(locale, 'settings.daily'), t(locale, 'settings.dailyHelp'));
    new Setting(containerEl).setName(t(locale, 'settings.destination')).setDesc(t(locale, 'settings.destinationHelp')).addDropdown((drop) => drop.addOption('follow-core', t(locale, 'setup.follow')).addOption('manual', t(locale, 'setup.manual')).setValue(this.plugin.moodSettings.dailyNote.mode).onChange(async (value) => { if (value === 'follow-core' || value === 'manual') { this.plugin.moodSettings.dailyNote.mode = value; await this.plugin.saveSettings(); this.refreshSettings(); } }));
    if (this.plugin.moodSettings.dailyNote.mode === 'manual') {
      this.pathSetting(containerEl, t(locale, 'settings.folder'), this.plugin.moodSettings.dailyNote.manual.folder, () => this.folderPaths(), async (value) => this.updateManual('folder', value));
      this.textSetting(containerEl, t(locale, 'settings.format'), this.plugin.moodSettings.dailyNote.manual.format, async (value) => this.updateManual('format', value));
      this.pathSetting(containerEl, t(locale, 'settings.template'), this.plugin.moodSettings.dailyNote.manual.templatePath ?? '', () => this.templatePaths(), async (value) => this.updateManual('templatePath', value || null));
      this.dailyPreview(containerEl, this.plugin.moodSettings.dailyNote.manual);
    } else this.coreSettingsDisplay(containerEl, locale);
    const moodHeader = this.heading(containerEl, t(locale, 'settings.moodLabels'), t(locale, 'settings.moodLabelsHelp'));
    moodHeader.createEl('button', { text: t(locale, 'settings.resetMoodLabels'), cls: 'mood-journal-add-tag-button' }).onclick = () => new ConfirmModal(this.app, { title: t(locale, 'settings.resetMoodLabels'), body: t(locale, 'settings.resetMoodLabelsConfirm'), cancelLabel: t(locale, 'entry.cancel'), confirmLabel: t(locale, 'settings.reset') }, () => { this.plugin.moodSettings.moodLabels = { ...LABELS[locale] }; void this.plugin.saveSettings().then(() => this.refreshSettings()); }).open();
    for (const score of [1, 2, 3, 4, 5] as MoodScore[]) this.textSetting(containerEl, `${MOODS[score]} ${score}`, this.plugin.moodSettings.moodLabels[score], async (value) => { if (value.trim().length < 1 || value.trim().length > 30 || /[\r\n]/u.test(value)) throw new Error('invalid mood label'); this.plugin.moodSettings.moodLabels[score] = value.trim(); });
    const tagsHeader = this.heading(containerEl, t(locale, 'settings.tags'), t(locale, 'settings.tagsHelp')); tagsHeader.createEl('button', { text: `+ ${t(locale, 'settings.addTag')}`, cls: 'mood-journal-add-tag-button' }).onclick = () => new ActivityEditorModal(this.plugin, () => this.refreshSettings()).open();
    const search = containerEl.createEl('input', { cls: 'mood-journal-activity-search', attr: { type: 'search', placeholder: t(locale, 'settings.searchTags'), 'aria-label': t(locale, 'settings.searchTags') } }); const tagList = containerEl.createDiv(); const activities = this.plugin.moodSettings.activities;
    for (const parent of activities.filter((activity) => activity.parentId === null)) { const group = tagList.createDiv({ cls: 'mood-journal-tag-group' }); group.dataset.searchText = `${parent.label} ${parent.slug} ${activities.filter((item) => item.parentId === parent.id).map((item) => `${item.label} ${item.slug}`).join(' ')}`.toLocaleLowerCase(); this.tagSetting(group, parent.id, parent.label, parent.hidden, false); for (const child of activities.filter((activity) => activity.parentId === parent.id)) this.tagSetting(group, child.id, child.label, child.hidden || parent.hidden, true); }
    search.oninput = () => { const query = search.value.trim().toLocaleLowerCase(); for (const group of Array.from(tagList.querySelectorAll<HTMLElement>('.mood-journal-tag-group'))) group.toggleClass('mood-journal-hidden', Boolean(query) && !(group.dataset.searchText ?? '').includes(query)); };
    this.heading(containerEl, t(locale, 'settings.setup'), t(locale, 'settings.setupHelp')); new Setting(containerEl).setName(t(locale, 'settings.restartSetup')).addButton((button) => button.setButtonText(t(locale, 'settings.start')).onClick(() => this.plugin.openSetupWizard()));
  }
  private dailyPreview(container: HTMLElement, settings: ManualDailyNoteSettings): void { try { new Setting(container).setName(t(this.plugin.moodSettings.locale, 'setup.preview')).setDesc(generateDailyNotePath(settings, (format) => moment.default().format(format))); } catch { new Setting(container).setName(t(this.plugin.moodSettings.locale, 'setup.preview')).setDesc('—'); } }
  private async updateManual(field: keyof ManualDailyNoteSettings, value: string | null): Promise<void> {
    const manual = { ...this.plugin.moodSettings.dailyNote.manual, [field]: value }; if (!manual.format.trim()) throw new Error('empty date format'); generateDailyNotePath(manual, (format) => moment.default().format(format));
    if (manual.templatePath !== null) { const target = this.plugin.app.metadataCache.getFirstLinkpathDest(manual.templatePath, '') ?? this.plugin.app.vault.getAbstractFileByPath(manual.templatePath.endsWith('.md') ? manual.templatePath : `${manual.templatePath}.md`); if (!(target instanceof TFile)) throw new Error('template missing'); }
    this.plugin.moodSettings.dailyNote.manual = manual;
  }
  private coreSettingsDisplay(container: HTMLElement, locale: 'ja' | 'en'): void {
    const setting = new Setting(container).setName(t(locale, 'settings.coreCurrent')).addButton((button) => button.setButtonText(t(locale, 'settings.redetect')).onClick(() => void this.redetectCore()));
    if (this.coreSettings !== null) setting.setDesc(`${this.coreSettings.folder || t(locale, 'setup.vaultRoot')} / ${this.coreSettings.format}${this.coreSettings.templatePath === null ? '' : ` / ${this.coreSettings.templatePath}`}`);
    else if (this.coreError) setting.setDesc(t(locale, 'settings.coreError'));
    else { setting.setDesc('…'); void this.redetectCore(); }
  }
  private async redetectCore(): Promise<void> { try { this.coreSettings = await new CoreDailyNoteConfigReader(this.plugin.app.vault).readCoreSettings(); this.coreError = false; } catch { this.coreSettings = null; this.coreError = true; } this.refreshSettings(); }
  private heading(container: HTMLElement, title: string, helpText: string): HTMLElement { const setting = new Setting(container).setName(title).setHeading(); setting.settingEl.addClass('mood-journal-settings-heading'); const help = setting.controlEl.createEl('button', { text: '?', cls: 'mood-journal-help-button', attr: { 'aria-label': `${title}の説明`, title: helpText, 'aria-expanded': 'false' } }); const description = container.createDiv({ text: helpText, cls: 'mood-journal-heading-help mood-journal-hidden' }); help.onclick = () => { const hidden = description.hasClass('mood-journal-hidden'); description.toggleClass('mood-journal-hidden', !hidden); help.setAttribute('aria-expanded', String(hidden)); }; return setting.controlEl; }
  private folderPaths(): string[] { return this.plugin.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder).map((folder) => folder.path).filter(Boolean); }
  private templatePaths(): string[] { return this.plugin.app.vault.getAllLoadedFiles().filter((file): file is TFile => file instanceof TFile && file.extension === 'md').map((file) => file.path); }
  private textSetting(container: HTMLElement, name: string, value: string, update: (value: string) => Promise<void>): void { new Setting(container).setName(name).addText((text) => { text.setValue(value); text.inputEl.addEventListener('blur', () => void this.saveTextValue(text.inputEl.value, update)); }); }
  private pathSetting(container: HTMLElement, name: string, value: string, values: () => string[], update: (value: string) => Promise<void>): void { new Setting(container).setName(name).addText((text) => { text.setValue(value); text.inputEl.addEventListener('blur', () => void this.saveTextValue(text.inputEl.value, update)); new PathSuggest(this.plugin, text.inputEl, values); }); }
  private async saveTextValue(value: string, update: (value: string) => Promise<void>): Promise<void> { try { await update(value); this.plugin.scheduleSettingsSave(); } catch { new Notice(t(this.plugin.moodSettings.locale, 'settings.invalidValue')); this.refreshSettings(); } }
  private tagSetting(container: HTMLElement, id: string, label: string, hidden: boolean, child: boolean): void { const locale = this.plugin.moodSettings.locale; let isHidden = hidden; const description = (): string => t(locale, isHidden ? 'settings.hidden' : 'settings.visible'); const setting = new Setting(container).setName(child ? `↳ ${label}` : label).setDesc(description()).addText((text) => { text.setValue(label); text.inputEl.addEventListener('blur', () => void this.renameTag(id, label, text.inputEl.value)); }).addButton((button) => button.setButtonText(isHidden ? t(locale, 'settings.restore') : t(locale, 'settings.hide')).onClick(async () => { isHidden = !isHidden; this.plugin.moodSettings.activities = new ActivityService().setHidden(this.plugin.moodSettings.activities, id, isHidden, new Date().toISOString()); await this.plugin.saveSettings(); setting.setDesc(description()); button.setButtonText(isHidden ? t(locale, 'settings.restore') : t(locale, 'settings.hide')); setting.settingEl.toggleClass('mood-journal-tag-is-hidden', isHidden); })); setting.settingEl.toggleClass('mood-journal-tag-is-hidden', isHidden); if (child) setting.settingEl.addClass('mood-journal-tag-child'); }
  private async renameTag(id: string, previous: string, value: string): Promise<void> { if (value === previous) return; try { this.plugin.moodSettings.activities = new ActivityService().rename(this.plugin.moodSettings.activities, id, value, new Date().toISOString()); await this.plugin.saveSettings(); this.refreshSettings(); } catch { new Notice(t(this.plugin.moodSettings.locale, 'settings.tagRenameError')); this.refreshSettings(); } }
  private refreshSettings(): void { const update = (this as unknown as { update?: () => void }).update; if (update) update.call(this); else this.display(); }
}
