import { MoodJournalError } from '../utils/errors';

export async function copyToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.body.createEl('textarea', { cls: 'mood-journal-clipboard-fallback' });
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.select();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- Legacy fallback when the Clipboard API is unavailable.
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new MoodJournalError('CLIPBOARD_FAILED', 'error.clipboardFailed');
  }
}
