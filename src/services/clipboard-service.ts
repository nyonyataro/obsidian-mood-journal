import { MoodJournalError } from '../utils/errors';

export async function copyToClipboard(value: string): Promise<void> {
  try { await navigator.clipboard.writeText(value); return; } catch { const textarea = document.createElement('textarea'); textarea.value = value; textarea.setAttribute('readonly', ''); textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.appendChild(textarea); textarea.select(); const copied = document.execCommand('copy'); textarea.remove(); if (!copied) throw new MoodJournalError('CLIPBOARD_FAILED', 'error.clipboardFailed'); }
}
