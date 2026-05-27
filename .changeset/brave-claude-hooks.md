---
"@holdpoint/engine-claude": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

Claude: use more of Claude Code's hook surface

Claude settings now inject configured session context at `SessionStart`, emit best-effort Live events for prompt/tool/permission/notification/subagent/compaction/session lifecycle hooks, and wrap completion checks so failures exit 2 and keep Claude in the loop. `holdpoint init` and `holdpoint update` now merge Holdpoint-managed Claude hooks into existing `.claude/settings.json` instead of replacing user hooks.
