# Mood Journal

Mood Journal records a five-level mood, optional activities, and an optional Markdown note in your normal Obsidian daily note. It is designed for desktop and mobile and stores everything locally.

## Setup and use

On first launch, choose a language and Daily notes mode. Use the smile ribbon icon or the **Open journal entry** command, choose a mood, optionally add activities or a note, and save. Use Ctrl/Cmd+Enter to save on desktop. You can choose a past or future date and time.

The plugin follows Obsidian Daily notes settings or uses its manual folder/date-format/template settings. It renders only core `{{title}}`, `{{date}}`, and `{{time}}` template variables; it does not execute Templater.

## Saved Markdown

```md
## 日記

> [!mood-log] 23:10 🙂 Good
> #日記 #activity/Personal/Walk
> <!-- mood-log-id: 2026-07-20T23:10:00.000+09:00 -->
> <!-- mood-score: 4 -->
>
> A short note.
```

Activities use up to two levels: `#activity/Parent` or `#activity/Parent/Child`. Mood labels and activities are stored in the plugin's `data.json`; journal entries remain Markdown. Broken manually edited logs are not repaired automatically.

## Privacy

Mood Journal makes no network requests and has no telemetry or analytics. It does not open saved notes automatically.

## Manual installation

Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/mood-journal/`, then enable the plugin. This path is documentation only; the plugin does not hard-code it.

## Development

```bash
npm ci
npm run check
```

Run `npm run dev` for watch mode. Releases are prepared by the tag-triggered draft workflow; create no release before device QA. Screenshots/GIFs should be added before public release.

The repository includes a [manual test plan](docs/manual-test-plan.md) for desktop, Android, iOS, sync, and destructive-safety checks.
See the [release checklist](docs/release-checklist.md) before creating a beta or Community release.

## Support

Report reproducible issues with Obsidian version, platform, and safe steps to reproduce. Do not include private journal content.

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include a redacted Markdown sample only when it is needed to reproduce the issue.

## License

[MIT](LICENSE)
