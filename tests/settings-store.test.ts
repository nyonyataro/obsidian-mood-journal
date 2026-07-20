import { describe, expect, it, vi } from 'vitest';
import type { Plugin } from 'obsidian';
import { defaultSettings } from '../src/settings/defaults';
import { SerializedSettingsStore } from '../src/settings/settings-store';

describe('SerializedSettingsStore', () => {
  it('continues saving after an earlier save fails', async () => {
    const saveData = vi.fn()
      .mockRejectedValueOnce(new Error('disk unavailable'))
      .mockResolvedValueOnce(undefined);
    const store = new SerializedSettingsStore({ saveData } as unknown as Plugin);

    await expect(store.save(defaultSettings('en'))).rejects.toThrow('disk unavailable');
    await expect(store.save(defaultSettings('ja'))).resolves.toBeUndefined();
    expect(saveData).toHaveBeenCalledTimes(2);
  });

  it('saves a snapshot instead of a later mutation', async () => {
    let releaseFirstSave: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      releaseFirstSave = resolve;
    });
    const saved: unknown[] = [];
    const saveData = vi.fn(async (data: unknown) => {
      saved.push(data);
      if (saved.length === 1) await firstSave;
    });
    const store = new SerializedSettingsStore({ saveData } as unknown as Plugin);
    const first = defaultSettings('en');
    const firstOperation = store.save(first);
    const second = defaultSettings('ja');
    const secondOperation = store.save(second);
    second.locale = 'en';

    releaseFirstSave?.();
    await Promise.all([firstOperation, secondOperation]);
    expect(saved).toHaveLength(2);
    expect((saved[1] as { locale: string }).locale).toBe('ja');
  });
});
