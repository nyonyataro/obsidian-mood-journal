import { Modal, Notice } from 'obsidian';
import { MOODS } from '../domain/mood';
import { isEffectivelyHidden, toggleActivitySelection } from '../domain/activity';
import type MoodJournalPlugin from '../main';
import type { ActivityDefinition, JournalDraft, MoodScore } from '../types';
import { t } from '../i18n';
import { MoodJournalError } from '../utils/errors';
import { ActivityEditorModal } from './activity-editor-modal';
import { copyToClipboard } from '../services/clipboard-service';
import { generateCallout } from '../markdown/callout-generator';
import { localDateInputValue, localTimeInputValue, parseManualDateTime, toOffsetIso } from '../utils/datetime';
import { DiscardConfirmModal } from './discard-confirm-modal';
import { isDraftDirty } from '../domain/journal-draft';

const emptyDraft = (): JournalDraft => ({ moodScore: null, activityIds: [], memo: '', dateTimeMode: 'auto', manualDate: '', manualTime: '' });

export class JournalEntryModal extends Modal {
  private draft = emptyDraft();
  private saving = false;
  private error = '';
  private query = '';
  private allowClose = false;
  private bodyScrollTop = 0;

  constructor(private readonly plugin: MoodJournalPlugin) { super(plugin.app); }
  override onOpen(): void { this.modalEl.addClass('mood-journal-dialog'); this.render(); }
  override close(): void { if (!this.allowClose && this.isDirty()) { new DiscardConfirmModal(this.app, this.plugin.moodSettings.locale, () => { this.allowClose = true; this.close(); }).open(); return; } super.close(); }

  private render(): void {
    const { contentEl } = this; const locale = this.plugin.moodSettings.locale; contentEl.empty(); contentEl.addClass('mood-journal-modal'); const body = contentEl.createDiv({ cls: 'mood-journal-modal-body' }); body.onscroll = () => { this.bodyScrollTop = body.scrollTop; };
    body.createEl('h2', { text: t(locale, 'entry.title') });
    body.createEl('p', { text: t(locale, 'entry.mood') }); const moods = body.createDiv({ cls: 'mood-journal-moods' });
    for (const score of [5, 4, 3, 2, 1] as MoodScore[]) { const button = moods.createEl('button', { text: `${MOODS[score]} ${this.plugin.moodSettings.moodLabels[score]}`, cls: 'mood-journal-mood' }); button.setAttribute('aria-pressed', String(this.draft.moodScore === score)); button.onclick = () => { this.draft.moodScore = this.draft.moodScore === score ? null : score; this.render(); }; }
    this.renderTags(body, locale);
    body.createEl('p', { text: t(locale, 'entry.journal') });
    const memo = body.createEl('textarea', { cls: 'mood-journal-memo', attr: { rows: '3', placeholder: t(locale, 'entry.memo'), 'aria-label': t(locale, 'entry.memo') } }); memo.value = this.draft.memo; memo.oninput = () => { this.draft.memo = memo.value; };
    const change = body.createEl('button', { text: this.draft.dateTimeMode === 'manual' ? t(locale, 'entry.closeDate') : t(locale, 'entry.changeDate') }); change.setAttribute('aria-expanded', String(this.draft.dateTimeMode === 'manual')); change.onclick = () => { this.bodyScrollTop = body.scrollTop; if (this.draft.dateTimeMode === 'manual') { this.draft.dateTimeMode = 'auto'; this.draft.manualDate = ''; this.draft.manualTime = ''; } else { const now = new Date(); this.draft.dateTimeMode = 'manual'; this.draft.manualDate ||= localDateInputValue(now); this.draft.manualTime ||= localTimeInputValue(now); } this.render(); };
    if (this.draft.dateTimeMode === 'manual') { const inputs = body.createDiv({ cls: 'mood-journal-date-inputs' }); const date = inputs.createEl('input', { attr: { type: 'date', value: this.draft.manualDate, 'aria-label': t(locale, 'entry.date') } }); date.onchange = () => { this.draft.manualDate = date.value; }; const time = inputs.createEl('input', { attr: { type: 'time', value: this.draft.manualTime, 'aria-label': t(locale, 'entry.time') } }); time.onchange = () => { this.draft.manualTime = time.value; }; body.createEl('button', { text: t(locale, 'entry.autoDate') }).onclick = () => { this.bodyScrollTop = body.scrollTop; this.draft.dateTimeMode = 'auto'; this.draft.manualDate = ''; this.draft.manualTime = ''; this.render(); }; }
    if (this.error) { const error = body.createDiv({ cls: 'mood-journal-error', attr: { role: 'alert' } }); error.createDiv({ text: this.error }); const actions = error.createDiv({ cls: 'mood-journal-error-actions' }); actions.createEl('button', { text: t(locale, 'entry.retry') }).onclick = () => void this.save(); actions.createEl('button', { text: t(locale, 'entry.copyMarkdown') }).onclick = () => void this.copyMarkdown(); }
    const footer = contentEl.createDiv({ cls: 'mood-journal-footer' }); footer.createEl('button', { text: t(locale, 'entry.cancel') }).onclick = () => this.close(); const save = footer.createEl('button', { text: this.saving ? t(locale, 'entry.saving') : t(locale, 'entry.save'), cls: 'mod-cta' }); save.disabled = this.draft.moodScore === null || this.saving; save.onclick = () => void this.save(); contentEl.onkeydown = (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void this.save(); return; } if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) && /^[1-5]$/u.test(event.key)) { this.bodyScrollTop = body.scrollTop; this.draft.moodScore = Number(event.key) as MoodScore; this.render(); } }; body.scrollTop = this.bodyScrollTop;
  }

  private renderTags(contentEl: HTMLElement, locale: 'ja' | 'en'): void {
    const header = contentEl.createDiv({ cls: 'mood-journal-activities-header' }); header.createEl('label', { text: t(locale, 'entry.activities') }); header.createEl('button', { text: `+ ${t(locale, 'entry.addActivity')}` }).onclick = () => new ActivityEditorModal(this.plugin, (id) => { const tag = this.plugin.moodSettings.activities.find((item) => item.id === id); if (tag !== undefined) this.draft.activityIds = toggleActivitySelection(this.draft.activityIds, tag, this.plugin.moodSettings.activities); this.render(); }).open();
    const search = contentEl.createEl('input', { cls: 'mood-journal-activity-search', attr: { type: 'search', placeholder: t(locale, 'entry.searchTags'), 'aria-label': t(locale, 'entry.searchTags') } }); search.value = this.query;
    const list = contentEl.createDiv({ cls: 'mood-journal-tag-picker' }); const all = this.plugin.moodSettings.activities; const compare = (left: ActivityDefinition, right: ActivityDefinition): number => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label); const parents = all.filter((item) => item.parentId === null && !isEffectivelyHidden(item, all)).sort(compare);
    for (const parent of parents) this.parentTagGroup(list, parent, all.filter((item) => item.parentId === parent.id && !isEffectivelyHidden(item, all)).sort(compare));
    const filter = (): void => { const query = search.value.trim().toLocaleLowerCase(); for (const tree of Array.from(list.querySelectorAll<HTMLElement>('.mood-journal-tag-tree'))) tree.toggleClass('mood-journal-hidden', Boolean(query) && !(tree.dataset.searchText ?? '').includes(query)); }; search.oninput = () => { this.query = search.value; filter(); }; filter();
  }

  private parentTagGroup(container: HTMLElement, parent: ActivityDefinition, children: ActivityDefinition[]): void {
    const tree = container.createDiv({ cls: 'mood-journal-tag-tree' }); tree.dataset.searchText = `${parent.label} ${parent.slug} ${children.map((child) => `${child.label} ${child.slug}`).join(' ')}`.toLocaleLowerCase(); const row = tree.createDiv({ cls: 'mood-journal-tag-parent-row' }); this.tagButton(row, parent, 'mood-journal-tag-parent');
    if (children.length === 0) return;
    const childList = tree.createDiv({ cls: 'mood-journal-tag-children' }); childList.createDiv({ text: '↳', cls: 'mood-journal-tag-child-marker', attr: { 'aria-hidden': 'true' } }); for (const child of children) this.tagButton(childList, child, 'mood-journal-tag-child-button');
  }
  private tagButton(container: HTMLElement, tag: ActivityDefinition, cls: string): void { const button = container.createEl('button', { text: tag.label, cls: `mood-journal-activity ${cls}` }); button.setAttribute('aria-pressed', String(this.draft.activityIds.includes(tag.id))); button.onclick = () => { this.draft.activityIds = toggleActivitySelection(this.draft.activityIds, tag, this.plugin.moodSettings.activities); this.render(); }; }
  private isDirty(): boolean { return isDraftDirty(this.draft); }
  private async save(): Promise<void> { if (this.saving || this.draft.moodScore === null) return; this.saving = true; this.error = ''; this.render(); try { await this.plugin.journalService.saveDraft(this.draft); await this.plugin.recordActivityUsage(this.draft.activityIds); this.allowClose = true; this.close(); new Notice(t(this.plugin.moodSettings.locale, 'notice.saved')); } catch (cause) { const code = cause instanceof MoodJournalError ? cause.code : 'UNKNOWN'; this.error = `${t(this.plugin.moodSettings.locale, 'error.save')} (${code})`; console.error('[mood-journal]', code, cause instanceof MoodJournalError ? cause.safeContext : {}, cause); } finally { this.saving = false; if (this.modalEl.isConnected) this.render(); } }
  private async copyMarkdown(): Promise<void> { if (this.draft.moodScore === null) return; const score = this.draft.moodScore; const occurredAt = this.draft.dateTimeMode === 'manual' ? parseManualDateTime(this.draft.manualDate, this.draft.manualTime) : new Date(); if (occurredAt === null) return; const id = toOffsetIso(occurredAt); const activities = this.draft.activityIds.flatMap((id) => { const tag = this.plugin.moodSettings.activities.find((item) => item.id === id); if (tag === undefined) return []; const parent = tag.parentId === null ? undefined : this.plugin.moodSettings.activities.find((item) => item.id === tag.parentId); return [{ activityId: tag.id, labelPath: parent === undefined ? tag.label : `${parent.label}/${tag.label}`, tag: parent === undefined ? `#activity/${tag.slug}` : `#activity/${parent.slug}/${tag.slug}` }]; }); try { await copyToClipboard(generateCallout({ id, occurredAt: id, moodScore: score, moodEmoji: MOODS[score], moodLabel: this.plugin.moodSettings.moodLabels[score], activities, memo: this.draft.memo })); new Notice(t(this.plugin.moodSettings.locale, 'notice.copied')); } catch (cause) { this.error = cause instanceof MoodJournalError ? cause.code : 'CLIPBOARD_FAILED'; this.render(); } }
}
