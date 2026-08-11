import { Modal } from 'obsidian';
import { t } from '../i18n';
import type { Locale } from '../types';

export class MarkdownPreviewModal extends Modal {
  constructor(app: Modal['app'], private readonly locale: Locale, private readonly markdown: string) { super(app); }
  override onOpen(): void {
    this.setTitle(t(this.locale, 'entry.markdownPreview'));
    this.contentEl.empty();
    this.contentEl.createEl('p', { text: t(this.locale, 'entry.markdownPreviewHelp') });
    const source = this.contentEl.createEl('textarea', {
      cls: 'mood-journal-markdown-preview',
      attr: { readonly: 'true', 'aria-label': t(this.locale, 'entry.markdownPreview') },
    });
    source.value = this.markdown;
    source.addEventListener('focus', () => source.select());
  }
  override onClose(): void { this.contentEl.empty(); }
}
