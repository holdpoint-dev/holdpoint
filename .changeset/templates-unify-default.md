---
"@holdpoint/cli": patch
"@holdpoint/types": patch
"holdpoint": patch
---

templates: single unified default.yaml replaces per-stack files

BREAKING (alpha): `holdpoint init --stack` is removed. `init` now
installs a single templates/default.yaml whose checks are gated on
`when:` path scopes and `conditionId:` file-existence markers, so
only relevant checks fire on any given change. Adding support for
a new stack means adding a condition + a gated check, not forking
a template.
