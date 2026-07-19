# Manual test plan

Run this plan in separate test vaults. Do not use a personal vault for destructive or template tests.

## Fixtures

1. Core Daily notes enabled with a folder and template.
2. Core Daily notes enabled without a template, using `YYYY/MM/YYYY-MM-DD`.
3. Core Daily notes disabled; configure Mood Journal manually.

For each fixture, create notes with no journal heading, one empty journal heading, valid logs, a malformed log, duplicate journal headings, a code-fence false heading, and a large journal section.

## Desktop

- Open through the ribbon and command palette.
- Save mood-only, memo-only, tag selections, parent/child selections, and a long multi-line memo.
- Save past, current, future, and same-minute entries.
- Verify a dirty close prompts for confirmation and a failed save preserves input.
- Verify the retry and Markdown-copy actions.
- Use keyboard-only navigation, Ctrl/Cmd+Enter, Japanese IME, and both light and dark themes.
- Change language, labels, tags, paths, and templates.

## Android and iOS

- Verify the modal width, 44px targets, software keyboard, long memo scrolling, tag search, date toggle, and fixed save action.
- Verify PC-to-mobile and mobile-to-PC sync without overwriting note content.

## Safety

- A duplicate `## 日記` must leave the target file unchanged.
- A malformed mood log must remain unchanged after inserting a new valid entry.
- A missing configured template must fail without creating an empty daily note.
