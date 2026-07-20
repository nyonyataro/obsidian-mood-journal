import { describe, expect, it } from 'vitest';
import { isKeyboardLikelyVisible, resolveVisibleViewport } from '../src/ui/visible-viewport';

describe('resolveVisibleViewport', () => {
  it('uses the visual viewport after the software keyboard opens', () => {
    expect(resolveVisibleViewport(800, { height: 480, offsetTop: 0 })).toEqual({
      height: 480,
      top: 0,
    });
  });

  it('tracks a visual viewport panned by Android WebView', () => {
    expect(resolveVisibleViewport(800, { height: 500, offsetTop: 120 })).toEqual({
      height: 500,
      top: 120,
    });
  });

  it('keeps the viewport inside the layout viewport', () => {
    expect(resolveVisibleViewport(800, { height: 500, offsetTop: 500 })).toEqual({
      height: 300,
      top: 500,
    });
  });

  it('falls back to the layout viewport', () => {
    expect(resolveVisibleViewport(800)).toEqual({ height: 800, top: 0 });
  });
});

describe('isKeyboardLikelyVisible', () => {
  it('detects a keyboard-sized visual viewport reduction', () => {
    expect(isKeyboardLikelyVisible(800, { height: 480, offsetTop: 0 })).toBe(true);
  });

  it('does not treat browser chrome changes as a keyboard', () => {
    expect(isKeyboardLikelyVisible(800, { height: 720, offsetTop: 0 })).toBe(false);
  });
});
