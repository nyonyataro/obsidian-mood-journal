export const MOOD_CHART_EDGE_PADDING = 8;

export function moodChartEdgeOptions(): {
  clip: { top: number; right: number; bottom: number; left: number };
  layout: { padding: { top: number; right: number; bottom: number; left: number } };
} {
  const padding = MOOD_CHART_EDGE_PADDING;
  return {
    clip: { top: padding, right: padding, bottom: padding, left: padding },
    layout: { padding: { top: padding, right: padding, bottom: padding, left: padding } },
  };
}
