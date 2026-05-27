---
"@holdpoint/engine-cursor": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

cursor: keep `.cursorrules` updates idempotent

Regenerating Holdpoint engine files no longer accumulates blank lines before the generated `.cursorrules` block.
