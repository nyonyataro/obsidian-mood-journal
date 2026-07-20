import { Modal, Setting } from 'obsidian';
import type MoodJournalPlugin from '../main';
import { ActivityService } from '../services/activity-service';
import { MoodJournalError } from '../utils/errors';
import { t } from '../i18n';
import { MobileModalViewport } from './mobile-modal-viewport';

export class ActivityEditorModal extends Modal {
  private parentId: string | null = null;
  private parentLabel = '';
  private childLabel = '';
  private error = '';
  private saving = false;
  private readonly mobileViewport: MobileModalViewport;

  constructor(
    private readonly plugin: MoodJournalPlugin,
    private readonly onCreated: (id: string) => void,
  ) {
    super(plugin.app);
    this.mobileViewport = new MobileModalViewport(this.containerEl, this.contentEl);
  }

  override onOpen(): void {
    this.modalEl.addClass('mood-journal-dialog');
    this.setTitle(t(this.plugin.moodSettings.locale, 'tagEditor.title'));
    this.render();
    this.mobileViewport.attach();
  }

  override onClose(): void {
    this.mobileViewport.detach();
    this.contentEl.empty();
  }

  private render(): void {
    const el = this.contentEl;
    const locale = this.plugin.moodSettings.locale;
    el.empty();
    el.addClass('mood-journal-modal');
    const body = el.createDiv({ cls: 'mood-journal-modal-body' });
    const parents = this.plugin.moodSettings.activities.filter(
      (activity) => activity.parentId === null && !activity.hidden,
    );
    let addButton: HTMLButtonElement | null = null;
    const updateAvailability = (): void => {
      if (addButton !== null) {
        addButton.disabled = this.saving || (this.parentId !== null && !this.childLabel.trim());
      }
    };

    new Setting(body).setName(t(locale, 'tagEditor.parent')).addDropdown((drop) => {
      drop.addOption('', t(locale, 'tagEditor.newParent'));
      for (const parent of parents) drop.addOption(parent.id, parent.label);
      drop.setValue(this.parentId ?? '').onChange((value) => {
        this.parentId = value || null;
        this.render();
      });
    });
    if (this.parentId === null) {
      new Setting(body).setName(t(locale, 'tagEditor.parentName')).addText((text) =>
        text.setValue(this.parentLabel).onChange((value) => {
          this.parentLabel = value;
        }),
      );
    }
    new Setting(body)
      .setName(this.parentId === null ? t(locale, 'tagEditor.childOptional') : t(locale, 'tagEditor.child'))
      .addText((text) =>
        text.setValue(this.childLabel).setPlaceholder(t(locale, 'tagEditor.example')).onChange((value) => {
          this.childLabel = value;
          updateAvailability();
        }),
      );
    if (this.error) body.createDiv({ text: this.error, cls: 'mood-journal-error', attr: { role: 'alert' } });

    const footer = el.createDiv({ cls: 'mood-journal-footer' });
    footer.createEl('button', { text: t(locale, 'entry.cancel') }).onclick = () => this.close();
    addButton = footer.createEl('button', {
      text: this.saving ? t(locale, 'entry.saving') : t(locale, 'tagEditor.add'),
      cls: 'mod-cta',
    });
    addButton.onclick = () => void this.save();
    updateAvailability();
    el.onkeydown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        if (!addButton?.disabled) void this.save();
      }
    };
    this.mobileViewport.refresh();
  }

  private async save(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    this.render();
    const now = new Date().toISOString();
    const previousActivities = this.plugin.moodSettings.activities;
    try {
      if (this.parentId !== null && !this.childLabel.trim()) {
        throw new MoodJournalError('INVALID_ACTIVITY', 'error.invalidActivity');
      }
      const service = new ActivityService();
      let activities = this.plugin.moodSettings.activities;
      let parentId = this.parentId;
      if (parentId === null) {
        const parent = service.add(activities, null, this.parentLabel, now);
        activities = parent.activities;
        parentId = parent.selectedId;
      }
      const result = this.childLabel.trim()
        ? service.add(activities, parentId, this.childLabel, now)
        : { activities, selectedId: parentId };
      this.plugin.moodSettings.activities = result.activities;
      await this.plugin.saveSettings();
      this.onCreated(result.selectedId);
      this.close();
    } catch {
      this.plugin.moodSettings.activities = previousActivities;
      this.error = t(this.plugin.moodSettings.locale, 'tagEditor.error');
    } finally {
      this.saving = false;
      if (this.modalEl.isConnected) this.render();
    }
  }
}
