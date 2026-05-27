---
"@holdpoint/cli": patch
"holdpoint": patch
---

templates: add default agent git workflow guidance

The default template now includes `MASTER_PROMPT.md` as session context and adds
a prompt check that tells agents when to use a branch + PR, when to commit
directly on the current branch, and when pushing is useful versus leaving a
local commit for handoff.
