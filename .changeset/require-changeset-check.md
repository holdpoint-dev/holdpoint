---
"@holdpoint/cli": minor
"@holdpoint/live-protocol": patch
"@holdpoint/yaml-core": patch
"@holdpoint/live-daemon": patch
---

Add `holdpoint require-changeset`, a smart release-note gate that discovers publishable package roots and fails when release-affecting package changes do not include a `.changeset/*.md` file. Starter templates now include this check so newly initialized projects get changeset enforcement automatically.

Keep the Live protocol schemas compatible with the current Zod record API.

Keep YAML validation errors compatible with the current Zod issue API.

Keep daemon WebSocket validation errors compatible with the current Zod issue API.
