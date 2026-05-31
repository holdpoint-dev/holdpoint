---
"@holdpoint/types": minor
"@holdpoint/yaml-core": patch
"@holdpoint/engine-claude": minor
"@holdpoint/engine-cursor": minor
"@holdpoint/engine-codex": minor
"@holdpoint/engine-copilot": minor
"@holdpoint/cli": patch
"holdpoint": minor
---

Inject current date and time into every prompt submission

All four agent engines now inject the current date/time as `additionalContext` whenever a prompt is submitted. This prevents the common failure mode where models anchor their sense of "now" to their training knowledge cutoff and make stale assumptions.

The feature is **on by default** — no config needed. To opt out, add `inject_datetime: false` to `checks.yaml`.

**Agent support:**

- Claude — `UserPromptSubmit` hook via `additionalContext`
- Cursor — `beforeSubmitPrompt` hook via `additional_context`
- Codex — `UserPromptSubmit` hook via `hookSpecificOutput.additionalContext`
- Copilot — `onUserPromptSubmitted` hook via `additionalContext`
