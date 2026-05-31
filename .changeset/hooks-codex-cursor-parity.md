---
"@holdpoint/engine-codex": minor
"@holdpoint/engine-cursor": minor
"holdpoint": patch
---

feat: configurable lifecycle hooks for Codex and Cursor (phase 2)

Extends the per-hook check/inject model (previously Claude-only) to the Codex
and Cursor engines, verified against the current hook APIs.

Codex (`.codex/holdpoint-check.mjs`):

- `SessionStart` and `UserPromptSubmit` inject context from `inject`/`prompt`
  checks bound to `session_start` / `message_submit` (plus `session_context_files`
  and datetime), via `hookSpecificOutput.additionalContext`.
- `PreToolUse` runs a blocking `--hook before_tool` gate (exit 2) when a `cmd`
  check targets `before_tool`.
- `SessionStart` is now wired whenever a `session_start` check exists, not only
  for `session_context_files`.

Cursor (`.cursor/holdpoint-hook.mjs`):

- `sessionStart` injects context for `session_start` checks (+ files).
- `preToolUse` denies a tool (`permission: "deny"`) when a `before_tool` `cmd`
  check fails.
- **Fix:** Cursor's `beforeSubmitPrompt` cannot inject context (it only gates
  submission) — the previous per-message datetime injection there was a no-op.
  Datetime and `message_submit` context are now folded into `sessionStart`, the
  only Cursor stage that accepts `additional_context`.

Both engines' generated scripts are covered by functional tests that execute the
script with mocked hook payloads and assert real injection / blocking behavior.
Copilot per-hook parity remains follow-up.
