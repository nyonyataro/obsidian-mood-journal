import { Modal } from 'obsidian';
import type { Locale } from '../types';
import { t } from '../i18n';

export class DiscardConfirmModal extends Modal {
  constructor(app: Modal['app'], private readonly locale: Locale, private readonly onDiscard: () => void) { super(app); }
  override onOpen(): void { this.modalEl.addClass('mood-journal-dialog'); this.contentEl.createEl('h2', { text: t(this.locale, 'discard.title') }); this.contentEl.createEl('p', { text: t(this.locale, 'discard.body') }); const footer = this.contentEl.createDiv({ cls: 'mood-journal-footer' }); footer.createEl('button', { text: t(this.locale, 'discard.continue') }).onclick = () => this.close(); footer.createEl('button', { text: t(this.locale, 'discard.confirm'), cls: 'mod-warning' }).onclick = () => { this.close(); this.onDiscard(); }; }
}
