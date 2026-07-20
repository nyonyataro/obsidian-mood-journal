export interface VisualViewportMetrics {
  height: number;
  offsetTop: number;
}

export interface VisibleViewport {
  height: number;
  top: number;
}

const nonNegativeFinite = (value: number, fallback: number): number =>
  Number.isFinite(value) && value >= 0 ? value : fallback;

export function resolveVisibleViewport(
  layoutHeight: number,
  visualViewport?: VisualViewportMetrics,
): VisibleViewport {
  const safeLayoutHeight = nonNegativeFinite(layoutHeight, 0);
  const top = nonNegativeFinite(visualViewport?.offsetTop ?? 0, 0);
  const visualHeight = nonNegativeFinite(visualViewport?.height ?? safeLayoutHeight, safeLayoutHeight);

  return {
    height: Math.max(0, Math.min(visualHeight, safeLayoutHeight - top)),
    top,
  };
}

export function isKeyboardLikelyVisible(
  layoutHeight: number,
  visualViewport?: VisualViewportMetrics,
): boolean {
  if (visualViewport === undefined) return false;
  const obscuredHeight = layoutHeight - visualViewport.offsetTop - visualViewport.height;
  return Number.isFinite(obscuredHeight) && obscuredHeight >= 120;
}
