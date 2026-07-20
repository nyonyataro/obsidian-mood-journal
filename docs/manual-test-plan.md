# Manual test plan

Run this plan in separate test vaults. Do not use a personal vault for destructive or template tests.

## Fixtures

1. Core Daily notes enabled with a folder and template.
2. Core Daily notes enabled without a template, using `YYYY/MM/YYYY-MM-DD`.
3. Core Daily notes disabled; configure Mood Journal manually.

For each fixture, create notes with no journal heading, one empty Japanese heading, one empty English heading, both language headings, valid logs, a malformed log, duplicate same-language headings, a code-fence false heading, and a large journal section.

## Desktop

- Open through the ribbon and command palette.
- Save mood-only, mood with a memo, mood with tag selections, parent/child selections, and a long multi-line memo.
- Verify memo or tag input without a mood cannot be saved.
- Save past, current, future, and same-minute entries.
- Verify a dirty close prompts for confirmation and a failed save preserves input.
- Verify the retry and Markdown-copy actions.
- Use keyboard-only navigation, Ctrl/Cmd+Enter, Japanese IME, and both light and dark themes.
- Change language, labels, tags, paths, and templates.

## Localization and Markdown

- Save a new entry in Japanese without activities and verify `## 日記` and `#日記`.
- Save a new entry in Japanese with activities and verify the line contains both `#日記` and `#日記/...`.
- Save a new entry in English without activities and verify `## Journal` and `#journal`.
- Save a new entry in English with activities and verify the line contains both `#journal` and `#journal/...`.
- Switch Japanese to English and save both languages into the same daily note.
- Switch English back to Japanese and verify the existing `## 日記` section is reused instead of creating a third journal section.
- Verify one Japanese and one English section can coexist without an error.
- Verify duplicate `## 日記` headings block Japanese writes and duplicate `## Journal` headings block English writes.
- Verify duplicate headings in the inactive language do not block a write to the active language.
- Verify existing `#activity/...` lines are not removed, replaced, or migrated after a new save.
- Verify newly generated Markdown never contains `#activity/`.
- Verify Markdown copy follows the current language and matches the normal save format.
- Verify the settings screen shows labels and visible/hidden state without `#activity/...` or any complete generated tag path.
- Verify the setup preview follows the selected language.
- Verify Japanese and English screenshots show the correct localized heading, root tag, mood label, and nested activity tag.

## Android and iOS

- Verify the modal width, 44px targets, software keyboard, long memo scrolling, tag search, date toggle, and fixed save action.
- On Android, focus the journal textarea and verify the textarea and Save button stay above the keyboard while typing multiple lines.
- With the Android keyboard open, scroll the modal and rotate the device; verify the modal remains inside the visible viewport.
- Repeat the Android keyboard test after switching between gesture navigation and 3-button navigation when available.
- On iPhone and iPad, repeat the keyboard tests in portrait and landscape and verify the modal respects the notch, Dynamic Island, and Home indicator safe areas.
- Verify the setup wizard and tag editor inputs remain visible above the keyboard on both Android and iOS.
- Verify Japanese and English saves and Markdown copy on Android.
- Verify PC-to-mobile and mobile-to-PC sync without overwriting note content.

## Safety

- A duplicate active-language journal heading must leave the target file unchanged.
- A malformed mood log must remain unchanged after inserting a new valid entry.
- A missing configured template must fail without creating an empty daily note.
- Existing frontmatter and Properties must remain unchanged.
- No activity-specific HTML comment may be added.
