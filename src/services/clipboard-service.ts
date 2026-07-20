import { MoodJournalError } from '../utils/errors';

export async function copyToClipboard(value: string): Promise<void> {
  try {
    if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(value);
  } catch {
    throw new MoodJournalError('CLIPBOARD_FAILED', 'error.clipboardFailed');
  }
}
