---
"@holdpoint/types": minor
"@holdpoint/yaml-core": minor
"@holdpoint/cli": minor
"@holdpoint/engine-claude": minor
"holdpoint": minor
---

feat: configurable lifecycle hooks + a context-injection behavior (Claude, phase 1)

Checks were previously hardwired to a single completion gate. They can now
attach to lifecycle hook points and seed context — not just block at the end.

Schema (`@holdpoint/types` + `@holdpoint/yaml-core`):

- `on:` now accepts `session_start`, `message_submit`, `before_tool`,
  `after_tool`, `session_end`, and `before_done` (default, unchanged).
- New `inject:` behavior alongside `cmd` and `prompt`: seed context as `text`,
  repo-relative `files`, and/or the current `datetime`. A check must set exactly
  one of `cmd` / `prompt` / `inject`.

Runner / CLI:

- `runDeterministicChecks` filters by hook; `holdpoint check --hook <event>`
  runs only the checks bound to that hook (default `before_done`, so existing
  behavior is unchanged).

Claude engine (first engine, end-to-end):

- `SessionStart` and `UserPromptSubmit` now emit context from `inject`/`prompt`
  checks bound to `session_start` / `message_submit` (plus the existing
  `session_context_files` and `inject_datetime`), via one hook-aware script.
- `PreToolUse` runs a blocking `--hook before_tool` gate when a `cmd` check
  targets `before_tool`.
- Hook wiring keys off config flags and which hooks the checks target, never off
  a check's command text, so editing a check doesn't churn `settings.json`.

UI:

- The Checks editor is reorganized around the model: the list is grouped by hook
  (Session start / Each message / Before a tool / Before finishing) and the
  detail panel segregates color-coded "When it runs", "What it does" (incl. the
  new Inject-context behavior), and "What triggers it" sections.
- The Activity tab's filter pills are replaced by a category-grouped dropdown.

Cursor, Codex, and Copilot parity is tracked as follow-up work; they continue to
honor `before_done` and the existing top-level context seeding.
