---
"@holdpoint/engine-claude": patch
"@holdpoint/engine-codex": patch
"@holdpoint/engine-copilot": patch
"@holdpoint/engine-cursor": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

Install holdpoint as a devDependency during init; hooks use node_modules/.bin

holdpoint init now runs `npm/pnpm/yarn install --save-dev holdpoint@alpha` after
writing all config files, using the detected package manager. This pins the
version in package.json and makes node_modules/.bin/holdpoint available so hooks
resolve locally without downloading on every fire.

All engine defaults change from `npx holdpoint@alpha check --staged` to
`node_modules/.bin/holdpoint check --staged`. The engines.\*.stop_command /
engines.copilot.check_command override still works as before.

Templates updated: holdpoint-evolve uses `node_modules/.bin/holdpoint evolve`
instead of `npx @holdpoint/cli@alpha evolve`.

MASTER_PROMPT.md updated: all `npx @holdpoint/cli@alpha` references → `holdpoint`
(short command, available via devDep after npm install).
