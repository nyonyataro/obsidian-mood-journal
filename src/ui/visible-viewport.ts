export interface VisualViewportMetrics {
  height: number;
  scale: number;
}
const positiveFinite = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export function resolveVisibleViewportHeight(
  layoutHeight: number,
  visualViewport?: VisualViewportMetrics,
): number {
  const safeLayoutHeight = positiveFinite(layoutHeight, 0);
  if (visualViewport === undefined) return safeLayoutHeight;

  const height = positiveFinite(visualViewport.height, safeLayoutHeight);
  const scale = positiveFinite(visualViewport.scale, 1);
  return Math.min(safeLayoutHeight, height * scale);
}
