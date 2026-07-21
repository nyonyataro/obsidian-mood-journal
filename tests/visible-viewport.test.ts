import { describe, expect, it } from 'vitest';
import { resolveVisibleViewportHeight } from '../src/ui/visible-viewport';

describe('resolveVisibleViewportHeight', () => {
  it('uses the visual viewport height after the software keyboard opens', () => {
    expect(resolveVisibleViewportHeight(800, { height: 480, scale: 1 })).toBe(480);
  });

  it('uses natural CSS pixels when the visual viewport reports a scale', () => {
    expect(resolveVisibleViewportHeight(800, { height: 400, scale: 1.5 })).toBe(600);
  });

  it('does not exceed the layout viewport', () => {
    expect(resolveVisibleViewportHeight(800, { height: 900, scale: 1 })).toBe(800);
  });

  it('falls back to the layout viewport for invalid metrics', () => {
    expect(resolveVisibleViewportHeight(800)).toBe(800);
    expect(resolveVisibleViewportHeight(800, { height: Number.NaN, scale: 1 })).toBe(800);
  });
});
