---
"@holdpoint/cli": patch
"holdpoint": patch
---

Fix three issues surfaced by real-world agent testing

1. install.sh: auto-add .holdpoint/ to .gitignore after init — the check-reports
   cache is runtime data and should not be committed.

2. typescript template: add a `has-lint-script` condition on the lint check so it
   skips gracefully when ESLint is not configured, instead of failing with
   "command not found". Also adds no-todos prompt so holdpoint-evolve does not
   propose it on first run.

3. init command: detect package manager (pnpm/yarn/npm) via lock file presence and
   substitute it throughout the generated checks.yaml. Projects using npm no longer
   get pnpm commands in their check suite.
