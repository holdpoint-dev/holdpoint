---
"@holdpoint/types": patch
"@holdpoint/yaml-core": patch
"@holdpoint/engine-claude": patch
"@holdpoint/engine-codex": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

Add engines.claude.stop_command and engines.codex.stop_command to checks.yaml schema

Engine-generated hook files now read an optional `engines.claude.stop_command` /
`engines.codex.stop_command` from checks.yaml and embed it instead of the hardcoded
`npx holdpoint@alpha check --staged`. This survives `holdpoint update` re-runs — the
override lives in checks.yaml, not in the generated files.

The holdpoint monorepo uses this to install itself as a workspace devDep and invoke
`node_modules/.bin/holdpoint check --staged` locally instead of downloading from npm.
