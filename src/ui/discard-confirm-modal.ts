import { Modal } from 'obsidian';
import type { Locale } from '../types';
import { t } from '../i18n';

interface ConfirmModalOptions {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  warning?: boolean;
}

export class ConfirmModal extends Modal {
  constructor(app: Modal['app'], private readonly options: ConfirmModalOptions, private readonly onConfirm: () => void) { super(app); }
  override onOpen(): void { this.modalEl.addClass('mood-journal-dialog'); this.setTitle(this.options.title); this.contentEl.createEl('p', { text: this.options.body }); const footer = this.contentEl.createDiv({ cls: 'mood-journal-footer' }); footer.createEl('button', { text: this.options.cancelLabel }).onclick = () => this.close(); footer.createEl('button', { text: this.options.confirmLabel, cls: this.options.warning === false ? 'mod-cta' : 'mod-warning' }).onclick = () => { this.close(); this.onConfirm(); }; }
  override onClose(): void { this.contentEl.empty(); }
}

export class DiscardConfirmModal extends ConfirmModal {
  constructor(app: Modal['app'], locale: Locale, onDiscard: () => void) { super(app, { title: t(locale, 'discard.title'), body: t(locale, 'discard.body'), cancelLabel: t(locale, 'discard.continue'), confirmLabel: t(locale, 'discard.confirm') }, onDiscard); }
}
