---
"@holdpoint/cli": patch
"holdpoint": patch
---

templates: guide changelog edits back to changesets

The default template now detects `CHANGELOG.md` edits in changesets-based projects and asks agents to move release notes into `.changeset/*.md` instead of hand-editing generated changelogs.
