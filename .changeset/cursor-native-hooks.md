---
"@holdpoint/cli": patch
"@holdpoint/engine-cursor": patch
"holdpoint": patch
---

cursor: install native project hooks for runtime enforcement

Cursor now receives `.cursor/hooks.json` and `.cursor/holdpoint-hook.mjs` in addition to the contextual `.cursorrules` block. The hooks inject configured session context, stream Cursor lifecycle/tool events into Holdpoint Live, and run Holdpoint checks on local `stop` / completed `subagentStop` events with automatic follow-up messages when checks fail.
