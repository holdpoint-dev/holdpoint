---
"@holdpoint/cli": patch
"@holdpoint/engine-claude": patch
"@holdpoint/engine-codex": patch
"@holdpoint/engine-cursor": patch
"@holdpoint/engine-copilot": patch
"holdpoint": patch
---

agent-context: breadcrumbs in standardized files + verified injection + Cursor promoted

- New: init and update splice a "Holdpoint workflow" breadcrumb
  into each agent's standardized instructions file (CLAUDE.md,
  .github/copilot-instructions.md, .cursor/rules/holdpoint.md,
  AGENTS.md). Marker-based; preserves user content outside the
  block; idempotent. Gives discoverability and lets agents that
  read these files natively pick up the rule without depending
  on the session-start hook.
- Split: MASTER_PROMPT.md is now ~50 imperative lines (always
  injected at session start, fits comfortably within engine
  truncation caps). The previous 341-line reference content
  moved to HOLDPOINT_REFERENCE.md, on disk for on-demand reads.
- New tests: each engine has a context-injection test that runs
  the SessionStart script with a fixture repo and asserts the
  critical "Run holdpoint check" sentence survives truncation.
  Prevents the silent regression where a long MASTER_PROMPT
  pushed the rule past the cap.
- Removed: stale "Cursor advisory" framing from README, init
  preflight, and docs. Cursor uses .cursor/hooks.json hook
  surface (sessionStart, preToolUse, stop, etc.) for full hard
  gating — same enforcement class as Claude and Copilot.
