---
"@holdpoint/engine-codex": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

codex: expand native hook coverage and Live telemetry

Codex now gets project hooks for prompt, tool, permission, compaction, subagent, and stop events. Holdpoint streams best-effort Live telemetry, injects bounded session/subagent context, and gates both `Stop` and `SubagentStop` while avoiding permission auto-approval.
