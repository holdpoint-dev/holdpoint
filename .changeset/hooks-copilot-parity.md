---
"@holdpoint/engine-copilot": minor
"holdpoint": patch
---

feat: configurable lifecycle hooks for Copilot (phase 3 — all engines done)

Completes per-hook parity across all four engines. After researching Copilot CLI
hooks vs. the Copilot SDK extension, the extension is the right vehicle: its
`userPromptSubmitted` can inject context (CLI hooks cannot), it gives a reliable
repo-level completion gate by intercepting the `task_complete` tool (CLI hooks
have no dependable repo-level stop gate), and it is the only surface that powers
Holdpoint Live's Copilot control bridge. CLI hooks are observational outside
`preToolUse` and still in preview with open reliability bugs.

So the existing `@github/copilot-sdk/extension` is generalized to the per-hook
model:

- `onSessionStart` seeds context from `session_start` checks (+ `session_context_files`).
- `onUserPromptSubmitted` seeds context from `message_submit` checks (+ datetime),
  combined with any live-control note queued from the dashboard.
- `onPreToolUse` keeps the `task_complete` completion gate (`before_done`) and now
  also runs a `--hook before_tool` cmd gate, denying the tool (`permissionDecision:
"deny"`) on failure.

Datetime is read from the immutable config at runtime instead of being baked per
build. The live-control bridge (inject queue, approve/deny, registered tools) is
unchanged.

All four engines (Claude, Codex, Cursor, Copilot) now support `session_start`,
`message_submit` (Cursor folds it into `session_start`), `before_tool`, and
`before_done`.
