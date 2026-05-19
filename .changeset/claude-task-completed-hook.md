---
"@holdpoint/engine-claude": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

Add TaskCompleted hook — closes the enforcement gap for Claude Code

Claude Code's TaskCompleted event fires inside the agentic loop when a task is
being marked complete, equivalent to Copilot's task_complete interception.
Non-zero exit blocks task completion and keeps Claude in context to fix issues.

Previously only Stop was used, which fires at each turn boundary but after
Claude has already finished responding — making it harder to iterate on failures.

The generated .claude/settings.json now registers both hooks: TaskCompleted as
the primary per-task gate, and Stop as a fallback for sessions that do not use
task management.
