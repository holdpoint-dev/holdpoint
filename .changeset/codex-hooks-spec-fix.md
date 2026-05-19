---
"@holdpoint/engine-codex": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

Fix engine-codex to match Codex hooks spec

Two bugs fixed in the Stop hook script:

1. stdio: "inherit" → "pipe" — CLI output was leaking to hook stdout as plain
   text, which the Codex Stop spec explicitly forbids ("plain text output is
   invalid for this event"). With inherit, err.stdout/err.stderr were also always
   empty on failure so check output was never surfaced.
2. Exit 0 with no stdout on success; exit 2 with captured stderr on failure.
   Codex uses the stderr text as the continuation prompt so the agent iterates.

Also adds SessionStart hook support: when session_context_files are configured,
a SessionStart entry is added to hooks.json. The same script (holdpoint-check.mjs)
handles both events by reading hook_event_name from Codex's JSON stdin and
dispatching accordingly. SessionStart outputs hookSpecificOutput.additionalContext
JSON per the Codex spec (plain text is also valid for SessionStart, but JSON is
explicit and forward-compatible).

Fixes misleading comment about config.toml — Codex warns if both hooks.json and
inline [hooks] exist in the same config layer. Users should use a separate JSON
file for their own hooks, not mix into config.toml.
