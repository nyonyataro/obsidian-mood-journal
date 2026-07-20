import { Platform } from 'obsidian';
import { isKeyboardLikelyVisible, resolveVisibleViewport } from './visible-viewport';

export class MobileModalViewport {
  private viewportFrame: number | null = null;
  private viewportTimers: number[] = [];
  private viewportWindow: Window | null = null;
  private visualViewport: VisualViewport | null = null;
  private attached = false;

  private readonly handleViewportChange = (): void => {
    this.syncViewport();
    this.scheduleFocusedElementReveal();
  };

  private readonly handleViewportSettle = (): void => {
    this.handleViewportChange();
    this.scheduleViewportSettle();
  };

  constructor(
    private readonly containerEl: HTMLElement,
    private readonly contentEl: HTMLElement,
  ) {}

  attach(): void {
    if (!Platform.isMobile || this.attached) return;
    this.attached = true;
    this.viewportWindow = this.contentEl.ownerDocument.defaultView;
    if (this.viewportWindow === null) {
      this.attached = false;
      return;
    }
    this.visualViewport = this.viewportWindow.visualViewport;
    this.containerEl.addClass('mood-journal-mobile-viewport');
    this.syncViewport();
    this.viewportWindow.addEventListener('resize', this.handleViewportChange);
    this.viewportWindow.addEventListener('orientationchange', this.handleViewportSettle);
    this.visualViewport?.addEventListener('resize', this.handleViewportChange);
    this.visualViewport?.addEventListener('scroll', this.handleViewportChange);
    this.contentEl.addEventListener('focusin', this.handleViewportSettle);
  }

  detach(): void {
    if (!this.attached) return;
    this.viewportWindow?.removeEventListener('resize', this.handleViewportChange);
    this.viewportWindow?.removeEventListener('orientationchange', this.handleViewportSettle);
    this.visualViewport?.removeEventListener('resize', this.handleViewportChange);
    this.visualViewport?.removeEventListener('scroll', this.handleViewportChange);
    this.contentEl.removeEventListener('focusin', this.handleViewportSettle);
    if (this.viewportFrame !== null) this.viewportWindow?.cancelAnimationFrame(this.viewportFrame);
    for (const timer of this.viewportTimers) this.viewportWindow?.clearTimeout(timer);
    this.viewportFrame = null;
    this.viewportTimers = [];
    this.visualViewport = null;
    this.viewportWindow = null;
    this.attached = false;
    this.containerEl.removeClass('mood-journal-mobile-viewport');
    this.containerEl.removeClass('mood-journal-keyboard-visible');
    this.containerEl.style.removeProperty('--mood-journal-viewport-height');
    this.containerEl.style.removeProperty('--mood-journal-viewport-top');
  }

  refresh(): void {
    if (this.attached) this.handleViewportChange();
  }

  private syncViewport(): void {
    const viewportWindow = this.viewportWindow;
    if (viewportWindow === null) return;
    const metrics = this.visualViewport === null
      ? undefined
      : {
          height: this.visualViewport.height,
          offsetTop: this.visualViewport.offsetTop,
        };
    const visibleViewport = resolveVisibleViewport(viewportWindow.innerHeight, metrics);
    this.containerEl.style.setProperty('--mood-journal-viewport-height', `${visibleViewport.height}px`);
    this.containerEl.style.setProperty('--mood-journal-viewport-top', `${visibleViewport.top}px`);
    this.containerEl.toggleClass(
      'mood-journal-keyboard-visible',
      isKeyboardLikelyVisible(viewportWindow.innerHeight, metrics),
    );
  }

  private scheduleViewportSettle(): void {
    const viewportWindow = this.viewportWindow;
    if (viewportWindow === null) return;
    for (const timer of this.viewportTimers) viewportWindow.clearTimeout(timer);
    this.viewportTimers = [100, 500, 1500].map((delay) =>
      viewportWindow.setTimeout(() => this.handleViewportChange(), delay),
    );
  }

  private scheduleFocusedElementReveal(): void {
    const viewportWindow = this.viewportWindow;
    if (viewportWindow === null) return;
    if (this.viewportFrame !== null) viewportWindow.cancelAnimationFrame(this.viewportFrame);
    this.viewportFrame = viewportWindow.requestAnimationFrame(() => {
      this.viewportFrame = null;
      const activeElement = this.contentEl.ownerDocument.activeElement;
      const scrollArea = this.contentEl.querySelector<HTMLElement>('.mood-journal-modal-body') ?? this.contentEl;
      if (activeElement === null || !scrollArea.contains(activeElement)) return;

      const activeRect = activeElement.getBoundingClientRect();
      const scrollRect = scrollArea.getBoundingClientRect();
      const margin = 12;
      if (activeRect.bottom > scrollRect.bottom - margin) {
        scrollArea.scrollTop += activeRect.bottom - scrollRect.bottom + margin;
      } else if (activeRect.top < scrollRect.top + margin) {
        scrollArea.scrollTop -= scrollRect.top - activeRect.top + margin;
      }
    });
  }
}
