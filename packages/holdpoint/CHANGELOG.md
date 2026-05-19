# holdpoint

## 0.1.0-alpha.11

### Patch Changes

- Add TaskCompleted hook — closes the enforcement gap for Claude Code

  Claude Code's TaskCompleted event fires inside the agentic loop when a task is
  being marked complete, equivalent to Copilot's task_complete interception.
  Non-zero exit blocks task completion and keeps Claude in context to fix issues.

  Previously only Stop was used, which fires at each turn boundary but after
  Claude has already finished responding — making it harder to iterate on failures.

  The generated .claude/settings.json now registers both hooks: TaskCompleted as
  the primary per-task gate, and Stop as a fallback for sessions that do not use
  task management.

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.11

## 0.1.0-alpha.10

### Patch Changes

- Fix three issues surfaced by real-world agent testing
  1. install.sh: auto-add .holdpoint/ to .gitignore after init — the check-reports
     cache is runtime data and should not be committed.
  2. typescript template: add a `has-lint-script` condition on the lint check so it
     skips gracefully when ESLint is not configured, instead of failing with
     "command not found". Also adds no-todos prompt so holdpoint-evolve does not
     propose it on first run.
  3. init command: detect package manager (pnpm/yarn/npm) via lock file presence and
     substitute it throughout the generated checks.yaml. Projects using npm no longer
     get pnpm commands in their check suite.

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.10

## 0.1.0-alpha.9

### Patch Changes

- Rewrite Copilot extension to delegate to the CLI instead of inlining check logic

  The generated extension.mjs shrank from 329 lines to 39. Instead of duplicating
  matchesWhen(), runCheck(), commit cache, staged-file detection, and auto-sync logic,
  the extension now shells out to `npx holdpoint@alpha check --staged` (or the
  configured engines.copilot.check_command override). The engine-when-sync check in
  checks.yaml is removed — it existed only to keep the two copies in sync.

  Adds engines.copilot.check_command to the checks.yaml schema, consistent with the
  engines.claude.stop_command and engines.codex.stop_command added previously.

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.9

## 0.1.0-alpha.8

### Patch Changes

- Add engines.claude.stop_command and engines.codex.stop_command to checks.yaml schema

  Engine-generated hook files now read an optional `engines.claude.stop_command` /
  `engines.codex.stop_command` from checks.yaml and embed it instead of the hardcoded
  `npx holdpoint@alpha check --staged`. This survives `holdpoint update` re-runs — the
  override lives in checks.yaml, not in the generated files.

  The holdpoint monorepo uses this to install itself as a workspace devDep and invoke
  `node_modules/.bin/holdpoint check --staged` locally instead of downloading from npm.

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.8

## 0.1.0-alpha.7

### Patch Changes

- Fix workspace:\* protocol leaking into published npm packages

  All packages were published via `npm publish` which does not convert pnpm's
  `workspace:*` dependency protocol to real version numbers. Switched CI to
  `pnpm publish --no-git-checks` which performs this conversion automatically.
  All packages need a version bump so clean tarballs can be published to npm.

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.7

## 0.1.0-alpha.6

### Patch Changes

- Remove dead task_complete gating code from generated holdpoint-check.mjs

  The Copilot hooks script (.github/hooks/holdpoint-check.mjs) was carrying ~280 lines of check-running logic that was never reachable — holdpoint.json only registers it for sessionStart events, and task_complete interception is handled exclusively by extension.mjs via the Copilot SDK. The script is now sessionStart-only (62 lines vs 344).

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.6

## 0.1.0-alpha.5

### Patch Changes

- fix: version consistency, PostToolUse noise, git-commit stdout, unknown-stack conditions, turbo cache
  - Unified all generated hook commands to `holdpoint@alpha` (was a mix of `@latest`, `@alpha`, and no tag)
  - Removed PostToolUse hook from engine-claude — it fired on every tool call with `||true`, blocking nothing; Stop hook is sufficient
  - Fixed git-commit check printing `true` to stdout: `2>/dev/null` → `>/dev/null 2>&1`
  - Gated `pnpm lint` and `pnpm typecheck` in `_base.yaml` behind an `is_node` condition (file_exists: package.json) so unknown-stack repos don't see confusing pnpm failures
  - Added explanatory comment to generated `holdpoint.json` when hooks is empty (extension.mjs handles task_complete interception)
  - Improved "no changed files" hint to tell new users to commit generated files
  - Added `../../templates/**` to turbo inputs for `@holdpoint/cli#build` so template edits invalidate the cache correctly
  - Removed pnpm-specific `.npmrc` keys (`auto-install-peers`, `shamefully-hoist`, `strict-peer-dependencies`) that caused npm warnings in the Stop hook

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.5

## 0.1.0-alpha.4

### Minor Changes

- feat: builder UI overhaul (list view with categories, check run history), CLI bundles builder, check reports written to disk

### Patch Changes

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.4

## 0.1.0-alpha.3

### Patch Changes

- feat: SHA commit cache, session.log progress feedback, async npm publish workflow
- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.3
