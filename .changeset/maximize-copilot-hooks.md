---
"@holdpoint/engine-copilot": patch
"holdpoint": patch
---

Copilot: harden completion gating and Live context

The Copilot extension now bounds session-context and check-output injection, uses safer repo-root path containment for `session_context_files`, emits Live `stop_pass` / `stop_block` events for `task_complete` gates, and surfaces context truncation as a Live meta event.
