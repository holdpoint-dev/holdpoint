---
"@holdpoint/engine-codex": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

Generate .codex/config.toml with [features] hooks = true

Hooks are enabled by default in Codex, but writing this explicitly at the
repo level prevents accidental user-level `hooks = false` from silently
disabling holdpoint enforcement without any visible signal.

init writes the file unconditionally (fresh install). update checks for an
existing [features] section — if absent it appends the fragment, if present
it trusts the user's existing setting rather than overwriting.
