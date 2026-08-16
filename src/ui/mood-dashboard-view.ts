import { ItemView, Notice, TFile, type WorkspaceLeaf } from 'obsidian';
import {
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { LABELS, MOOD_SCORE_ORDER, MOODS } from '../domain/mood';
import { t } from '../i18n';
import { aggregateMoodRecords } from '../analytics/mood-aggregator';
import { MoodLogScanner } from '../analytics/mood-log-scanner';
import { moodChartEdgeOptions } from './mood-dashboard-chart-config';
import type { Locale, MoodDashboardModel, MoodDashboardRange, MoodLogRecord } from '../types';

Chart.register(CategoryScale, LineController, LineElement, LinearScale, PointElement, Tooltip);

export const VIEW_TYPE_MOOD_DASHBOARD = 'mood-journal-dashboard';

interface MoodChartInstance {
  destroy(): void;
}

const RANGES: readonly { value: MoodDashboardRange; label: 'dashboard.range30' | 'dashboard.range90' | 'dashboard.rangeAll' }[] = [
  { value: '30d', label: 'dashboard.range30' },
  { value: '90d', label: 'dashboard.range90' },
  { value: 'all', label: 'dashboard.rangeAll' },
];

export class MoodDashboardView extends ItemView {
  private chart: MoodChartInstance | null = null;
  private range: MoodDashboardRange = '30d';
  private records: MoodLogRecord[] = [];
  private loaded = false;
  private dirty = true;
  private refreshQueued = false;
  private refreshing = false;
  private opened = false;
  private refreshTimer: number | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly scanner: MoodLogScanner,
    private readonly getLocale: () => Locale,
  ) {
    super(leaf);
  }

  getViewType(): string { return VIEW_TYPE_MOOD_DASHBOARD; }
  getDisplayText(): string { return t(this.getLocale(), 'dashboard.title'); }

  override async onOpen(): Promise<void> {
    this.opened = true;
    this.dirty = true;
    this.refreshQueued = true;
    this.renderLoading();
    await this.refresh();
  }

  override onClose(): Promise<void> {
    this.opened = false;
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.destroyChart();
    this.contentEl.empty();
    return Promise.resolve();
  }

  markDirty(): void {
    this.dirty = true;
    this.refreshQueued = true;
    if (!this.opened) return;
    this.scheduleRefresh();
  }

  refreshNow(): void {
    this.dirty = true;
    this.refreshQueued = true;
    void this.refresh();
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 350);
  }

  private async refresh(): Promise<void> {
    if (!this.opened || this.refreshing || (!this.dirty && this.loaded)) return;
    this.refreshing = true;
    try {
      do {
        this.refreshQueued = false;
        this.dirty = false;
        this.renderLoading();
        const records = await this.scanner.scan();
        if (!this.opened) return;
        this.records = records;
        this.loaded = true;
        this.renderModel(aggregateMoodRecords(records, this.range));
      } while (this.refreshQueued && this.opened);
    } catch {
      if (this.opened) this.renderError();
    } finally {
      this.refreshing = false;
      if (this.refreshQueued && this.opened) this.scheduleRefresh();
    }
  }

  private renderLoading(): void {
    this.destroyChart();
    this.contentEl.empty();
    this.contentEl.addClass('mood-dashboard-view');
    this.contentEl.createDiv({ cls: 'mood-dashboard-state', text: t(this.getLocale(), 'dashboard.loading') });
  }

  private renderError(): void {
    this.destroyChart();
    this.contentEl.empty();
    this.contentEl.addClass('mood-dashboard-view');
    const state = this.contentEl.createDiv({ cls: 'mood-dashboard-state mood-dashboard-state-error' });
    state.createEl('p', { text: t(this.getLocale(), 'dashboard.error') });
    state.createEl('button', { text: t(this.getLocale(), 'dashboard.retry'), attr: { type: 'button' } }).onclick = () => this.refreshNow();
  }

  private renderModel(model: MoodDashboardModel): void {
    const locale = this.getLocale();
    this.destroyChart();
    this.contentEl.empty();
    this.contentEl.addClass('mood-dashboard-view');
    this.renderHeader(locale);
    this.renderRangeControls(locale);
    if (model.totalRecords === 0) {
      this.contentEl.createDiv({ cls: 'mood-dashboard-state', text: t(locale, 'dashboard.empty') });
      return;
    }
    this.renderSummary(model, locale);
    this.renderTrend(model, locale);
    this.renderDistribution(model, locale);
    this.renderDailyList(model, locale);
  }

  private renderHeader(locale: Locale): void {
    const header = this.contentEl.createDiv({ cls: 'mood-dashboard-header' });
    const title = header.createDiv({ cls: 'mood-dashboard-title' });
    title.createEl('h2', { text: t(locale, 'dashboard.title') });
    title.createEl('p', { text: `${t(locale, 'dashboard.updated')}: ${this.formatTimestamp(locale)}`, cls: 'mood-dashboard-updated' });
    const refresh = header.createEl('button', { text: '↻', cls: 'mood-dashboard-refresh', attr: { type: 'button', 'aria-label': t(locale, 'dashboard.refresh'), title: t(locale, 'dashboard.refresh') } });
    refresh.onclick = () => this.refreshNow();
  }

  private renderRangeControls(locale: Locale): void {
    const group = this.contentEl.createDiv({ cls: 'mood-dashboard-ranges', attr: { role: 'group', 'aria-label': t(locale, 'dashboard.range') } });
    for (const range of RANGES) {
      const button = group.createEl('button', { text: t(locale, range.label), attr: { type: 'button', 'aria-pressed': String(this.range === range.value) } });
      button.toggleClass('is-active', this.range === range.value);
      button.onclick = () => this.selectRange(range.value);
    }
  }

  private selectRange(range: MoodDashboardRange): void {
    if (this.range === range) return;
    this.range = range;
    if (!this.loaded) {
      this.refreshNow();
      return;
    }
    this.renderModel(aggregateMoodRecords(this.records, range));
  }

  private renderSummary(model: MoodDashboardModel, locale: Locale): void {
    const summary = this.contentEl.createDiv({ cls: 'mood-dashboard-summary' });
    this.summaryCard(summary, t(locale, 'dashboard.average'), model.averageScore === null ? '—' : `${model.averageScore.toFixed(1)} ${t(locale, 'dashboard.averageUnit')}`);
    this.summaryCard(summary, t(locale, 'dashboard.records'), `${model.totalRecords} ${t(locale, 'dashboard.recordsUnit')}`);
    this.summaryCard(summary, t(locale, 'dashboard.days'), `${model.recordDays} ${t(locale, 'dashboard.daysUnit')}`);
  }

  private summaryCard(container: HTMLElement, label: string, value: string): void {
    const card = container.createDiv({ cls: 'mood-dashboard-summary-card' });
    card.createSpan({ text: label, cls: 'mood-dashboard-summary-label' });
    card.createEl('strong', { text: value, cls: 'mood-dashboard-summary-value' });
  }

  private renderTrend(model: MoodDashboardModel, locale: Locale): void {
    const section = this.section(t(locale, 'dashboard.trend'));
    const chartBox = section.createDiv({ cls: 'mood-dashboard-chart' });
    const canvas = chartBox.createEl('canvas', { attr: { role: 'img', 'aria-label': t(locale, 'dashboard.trend') } });
    try {
      this.createChart(canvas, model, locale);
    } catch (error) {
      canvas.remove();
      console.error('[mood-journal] dashboard chart failed', error);
    }
    const details = section.createEl('details', { cls: 'mood-dashboard-chart-details' });
    details.createEl('summary', { text: t(locale, 'dashboard.chartData') });
    const list = details.createEl('ul');
    for (const day of model.daily.filter((item) => item.entryCount > 0)) {
      list.createEl('li', { text: `${this.formatDate(day.dateKey, locale)}: ${this.formatAverage(day.averageScore, locale)} (${day.entryCount})` });
    }
  }

  private createChart(canvas: HTMLCanvasElement, model: MoodDashboardModel, locale: Locale): void {
    const styles = getComputedStyle(this.contentEl);
    const accent = styles.getPropertyValue('--interactive-accent').trim() || '#7c3aed';
    const text = styles.getPropertyValue('--text-muted').trim() || '#888888';
    const border = styles.getPropertyValue('--background-modifier-border').trim() || '#888888';
    const edgeOptions = moodChartEdgeOptions();
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: model.daily.map((day) => this.formatDate(day.dateKey, locale)),
        datasets: [{
          data: model.daily.map((day) => day.averageScore),
          borderColor: accent,
          backgroundColor: accent,
          pointRadius: model.daily.length > 45 ? 0 : 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.25,
          spanGaps: true,
          clip: edgeOptions.clip,
          segment: {
            borderDash: (context) => context.p0.skip || context.p1.skip ? [5, 5] : undefined,
          },
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: edgeOptions.layout,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${this.formatAverage(context.parsed.y, locale)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: text, maxTicksLimit: 8, autoSkip: true } },
          y: { min: 1, max: 5, ticks: { color: text, stepSize: 1 }, grid: { color: border } },
        },
      },
    });
  }

  private renderDistribution(model: MoodDashboardModel, locale: Locale): void {
    const section = this.section(t(locale, 'dashboard.distribution'));
    const max = Math.max(...Object.values(model.distribution));
    const distribution = section.createDiv({ cls: 'mood-dashboard-distribution' });
    for (const score of MOOD_SCORE_ORDER) {
      const count = model.distribution[score];
      const row = distribution.createDiv({ cls: 'mood-dashboard-distribution-row' });
      row.createSpan({ text: `${MOODS[score]} ${LABELS[locale][score]}`, cls: 'mood-dashboard-distribution-label' });
      const track = row.createDiv({ cls: 'mood-dashboard-distribution-track', attr: { role: 'progressbar', 'aria-label': `${LABELS[locale][score]}: ${count}`, 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(count) } });
      track.createDiv({ cls: 'mood-dashboard-distribution-fill' }).style.width = `${max === 0 ? 0 : (count / max) * 100}%`;
      row.createSpan({ text: String(count), cls: 'mood-dashboard-distribution-count' });
    }
  }

  private renderDailyList(model: MoodDashboardModel, locale: Locale): void {
    const section = this.section(t(locale, 'dashboard.daily'));
    const table = section.createEl('table', { cls: 'mood-dashboard-table' });
    const head = table.createEl('thead').createEl('tr');
    head.createEl('th', { text: t(locale, 'dashboard.date') });
    head.createEl('th', { text: t(locale, 'dashboard.score') });
    head.createEl('th', { text: t(locale, 'dashboard.count') });
    head.createEl('th', { text: '' });
    const body = table.createEl('tbody');
    for (const day of model.daily.filter((item) => item.entryCount > 0).reverse()) {
      const row = body.createEl('tr');
      row.createEl('td', { text: this.formatDate(day.dateKey, locale) });
      row.createEl('td', { text: this.formatAverage(day.averageScore, locale) });
      row.createEl('td', { text: String(day.entryCount) });
      const action = row.createEl('td');
      const sourcePath = day.sourcePaths[0];
      if (sourcePath !== undefined) {
        action.createEl('button', { text: t(locale, 'dashboard.openNote'), cls: 'mood-dashboard-open-note', attr: { type: 'button' } }).onclick = () => void this.openSourceNote(sourcePath);
      }
    }
  }

  private section(title: string, description?: string): HTMLElement {
    const section = this.contentEl.createDiv({ cls: 'mood-dashboard-section' });
    section.createEl('h3', { text: title });
    if (description !== undefined) section.createEl('p', { text: description, cls: 'mood-dashboard-section-help' });
    return section;
  }

  private async openSourceNote(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(t(this.getLocale(), 'dashboard.noNote'));
      return;
    }
    try {
      await this.app.workspace.getLeaf(false).openFile(file);
    } catch {
      new Notice(t(this.getLocale(), 'dashboard.noNote'));
    }
  }

  private formatAverage(value: number | null, locale: Locale): string {
    return value === null ? '—' : `${value.toFixed(1)} ${t(locale, 'dashboard.averageUnit')}`;
  }

  private formatDate(dateKey: string, locale: Locale): string {
    const date = new Date(`${dateKey}T12:00:00`);
    return Number.isNaN(date.getTime()) ? dateKey : new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' }).format(date);
  }

  private formatTimestamp(locale: Locale): string {
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
