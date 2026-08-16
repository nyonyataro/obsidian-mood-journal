import { describe, expect, it } from 'vitest';
import { MOOD_SCORE_ORDER } from '../src/domain/mood';
import { MOOD_CHART_EDGE_PADDING, moodChartEdgeOptions } from '../src/ui/mood-dashboard-chart-config';

describe('mood dashboard presentation contract', () => {
  it('uses the same descending mood order for all visible mood lists', () => {
    expect(MOOD_SCORE_ORDER).toEqual([5, 4, 3, 2, 1]);
  });

  it('keeps chart marks visible at every edge of the plot', () => {
    const options = moodChartEdgeOptions();
    const expected = {
      top: MOOD_CHART_EDGE_PADDING,
      right: MOOD_CHART_EDGE_PADDING,
      bottom: MOOD_CHART_EDGE_PADDING,
      left: MOOD_CHART_EDGE_PADDING,
    };

    expect(options.clip).toEqual(expected);
    expect(options.layout.padding).toEqual(expected);
  });
});
