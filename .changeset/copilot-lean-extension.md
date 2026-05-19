---
"@holdpoint/types": patch
"@holdpoint/yaml-core": patch
"@holdpoint/engine-copilot": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

Rewrite Copilot extension to delegate to the CLI instead of inlining check logic

The generated extension.mjs shrank from 329 lines to 39. Instead of duplicating
matchesWhen(), runCheck(), commit cache, staged-file detection, and auto-sync logic,
the extension now shells out to `npx holdpoint@alpha check --staged` (or the
configured engines.copilot.check_command override). The engine-when-sync check in
checks.yaml is removed — it existed only to keep the two copies in sync.

Adds engines.copilot.check_command to the checks.yaml schema, consistent with the
engines.claude.stop_command and engines.codex.stop_command added previously.
