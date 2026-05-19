---
"@holdpoint/engine-copilot": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

Copilot engine: extension-only — remove shell hooks entirely

The extension now handles both responsibilities in one file:

- onSessionStart: reads checks.immutable.json (pre-parsed JSON — no YAML parser
  needed in plain .mjs) and injects session_context_files as additionalContext
- onPreToolUse: intercepts task_complete, delegates to holdpoint CLI for checks

The shell hooks system (.github/hooks/holdpoint.json + holdpoint-check.mjs) is
removed. It existed because session context injection predated the extension, not
because it was the right mechanism. The SDK extension is deterministic, runs as a
persistent process over JSON-RPC, and handles both jobs cleanly.

Copilot agent detection now looks for extension.mjs instead of holdpoint.json.
