import { Platform } from 'obsidian';
import { resolveVisibleViewportHeight } from './visible-viewport';

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

export function willOpenSoftwareKeyboard(target: Element | null): target is HTMLElement {
  return (
    (target instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(target.type)) ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
export class MobileModalViewport {
  private viewportFrame: number | null = null;
  private viewportWindow: Window | null = null;
  private visualViewport: VisualViewport | null = null;
  private focusedInput: HTMLElement | null = null;
  private attached = false;

  private readonly handleViewportChange = (): void => {
    if (this.visualViewport !== null && this.visualViewport.scale > 1) return;
    this.syncViewportHeight();
    this.scheduleFocusedInputReveal();
  };

  private readonly handleFocusIn = (event: FocusEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (!willOpenSoftwareKeyboard(target)) return;
    this.focusedInput = target;
    this.handleViewportChange();
  };

  private readonly handleFocusOut = (): void => {
    const viewportWindow = this.viewportWindow;
    if (viewportWindow === null) return;
    viewportWindow.requestAnimationFrame(() => {
      const activeElement = this.contentEl.ownerDocument.activeElement;
      this.focusedInput = willOpenSoftwareKeyboard(activeElement) && this.contentEl.contains(activeElement)
        ? activeElement
        : null;
      if (this.focusedInput === null && Platform.isIosApp) {
        this.setViewportHeight(this.contentEl.ownerDocument.documentElement.clientHeight);
      } else {
        this.handleViewportChange();
      }
    });
  };

  constructor(
    private readonly modalEl: HTMLElement,
    private readonly contentEl: HTMLElement,
  ) {}

  attach(): void {
    if (!Platform.isMobile || this.attached) return;
    const viewportWindow = this.contentEl.ownerDocument.defaultView;
    if (viewportWindow === null) return;

    this.attached = true;
    this.viewportWindow = viewportWindow;
    this.visualViewport = viewportWindow.visualViewport;
    this.modalEl.addClass('mood-journal-mobile-dialog');
    this.syncViewportHeight();
    viewportWindow.addEventListener('resize', this.handleViewportChange);
    this.visualViewport?.addEventListener('resize', this.handleViewportChange);
    this.visualViewport?.addEventListener('scroll', this.handleViewportChange);
    this.contentEl.addEventListener('focusin', this.handleFocusIn);
    this.contentEl.addEventListener('focusout', this.handleFocusOut);
  }

  detach(): void {
    if (!this.attached) return;
    this.viewportWindow?.removeEventListener('resize', this.handleViewportChange);
    this.visualViewport?.removeEventListener('resize', this.handleViewportChange);
    this.visualViewport?.removeEventListener('scroll', this.handleViewportChange);
    this.contentEl.removeEventListener('focusin', this.handleFocusIn);
    this.contentEl.removeEventListener('focusout', this.handleFocusOut);
    if (this.viewportFrame !== null) this.viewportWindow?.cancelAnimationFrame(this.viewportFrame);
    this.viewportFrame = null;
    this.focusedInput = null;
    this.visualViewport = null;
    this.viewportWindow = null;
    this.attached = false;
    this.modalEl.removeClass('mood-journal-mobile-dialog');
    this.modalEl.style.removeProperty('--mood-journal-visible-height');
  }

  refresh(): void {
    if (!this.attached) return;
    this.handleViewportChange();
  }

  private syncViewportHeight(): void {
    const documentElement = this.contentEl.ownerDocument.documentElement;
    const metrics = this.visualViewport === null
      ? undefined
      : { height: this.visualViewport.height, scale: this.visualViewport.scale };
    this.setViewportHeight(resolveVisibleViewportHeight(documentElement.clientHeight, metrics));
  }

  private setViewportHeight(height: number): void {
    this.modalEl.style.setProperty('--mood-journal-visible-height', `${height}px`);
  }

  private scheduleFocusedInputReveal(): void {
    const viewportWindow = this.viewportWindow;
    if (viewportWindow === null || this.focusedInput === null) return;
    if (this.viewportFrame !== null) viewportWindow.cancelAnimationFrame(this.viewportFrame);
    this.viewportFrame = viewportWindow.requestAnimationFrame(() => {
      this.viewportFrame = null;
      const focusedInput = this.focusedInput;
      const scrollArea = this.contentEl.querySelector<HTMLElement>('.mood-journal-modal-body');
      if (focusedInput === null || scrollArea === null || !scrollArea.contains(focusedInput)) return;

      const inputRect = focusedInput.getBoundingClientRect();
      const scrollRect = scrollArea.getBoundingClientRect();
      const visibleTop = Math.max(scrollRect.top, this.visualViewport?.offsetTop ?? scrollRect.top);
      const visualBottom = this.visualViewport === null
        ? scrollRect.bottom
        : this.visualViewport.offsetTop + this.visualViewport.height;
      const visibleBottom = Math.min(scrollRect.bottom, visualBottom);
      const margin = 12;
      if (inputRect.bottom > visibleBottom - margin) {
        scrollArea.scrollTop += inputRect.bottom - visibleBottom + margin;
      } else if (inputRect.top < visibleTop + margin) {
        scrollArea.scrollTop -= visibleTop - inputRect.top + margin;
      }
    });
  }
}
