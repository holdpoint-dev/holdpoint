---
"@holdpoint/yaml-core": patch
"@holdpoint/engine-copilot": patch
"@holdpoint/engine-claude": patch
"@holdpoint/engine-cursor": patch
"@holdpoint/engine-codex": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

Fix workspace:* protocol leaking into published npm packages

All packages were published via `npm publish` which does not convert pnpm's
`workspace:*` dependency protocol to real version numbers. Switched CI to
`pnpm publish --no-git-checks` which performs this conversion automatically.
All packages need a version bump so clean tarballs can be published to npm.
