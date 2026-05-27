# @holdpoint/engine-cursor

## 0.1.0-alpha.11

### Patch Changes

- 42a9a4f: agent-context: breadcrumbs in standardized files + verified injection + Cursor promoted
  - New: init and update splice a "Holdpoint workflow" breadcrumb
    into each agent's standardized instructions file (CLAUDE.md,
    .github/copilot-instructions.md, .cursor/rules/holdpoint.md,
    AGENTS.md). Marker-based; preserves user content outside the
    block; idempotent. Gives discoverability and lets agents that
    read these files natively pick up the rule without depending
    on the session-start hook.
  - Split: MASTER_PROMPT.md is now ~50 imperative lines (always
    injected at session start, fits comfortably within engine
    truncation caps). The previous 341-line reference content
    moved to HOLDPOINT_REFERENCE.md, on disk for on-demand reads.
  - New tests: each engine has a context-injection test that runs
    the SessionStart script with a fixture repo and asserts the
    critical "Run holdpoint check" sentence survives truncation.
    Prevents the silent regression where a long MASTER_PROMPT
    pushed the rule past the cap.
  - Removed: stale "Cursor advisory" framing from README, init
    preflight, and docs. Cursor uses .cursor/hooks.json hook
    surface (sessionStart, preToolUse, stop, etc.) for full hard
    gating — same enforcement class as Claude and Copilot.

- 93230de: cursor: install native project hooks for runtime enforcement

  Cursor now receives `.cursor/hooks.json` and `.cursor/holdpoint-hook.mjs` in addition to the contextual `.cursorrules` block. The hooks inject configured session context, stream Cursor lifecycle/tool events into Holdpoint Live, and run Holdpoint checks on local `stop` / completed `subagentStop` events with automatic follow-up messages when checks fail.

- ab18bdf: cursor: keep `.cursorrules` updates idempotent

  Regenerating Holdpoint engine files no longer accumulates blank lines before the generated `.cursorrules` block.

- Updated dependencies [8bb895f]
- Updated dependencies [e861761]
  - @holdpoint/live-protocol@0.1.0-alpha.3
  - @holdpoint/types@0.1.0-alpha.8
  - @holdpoint/sdk@0.1.0-alpha.3

## 0.1.0-alpha.10

### Patch Changes

- Updated dependencies
  - @holdpoint/types@0.1.0-alpha.7

## 0.1.0-alpha.9

### Patch Changes

- Install holdpoint as a devDependency during init; hooks use node_modules/.bin

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

## 0.1.0-alpha.8

### Patch Changes

- Updated dependencies
  - @holdpoint/types@0.1.0-alpha.6

## 0.1.0-alpha.7

### Patch Changes

- Updated dependencies
  - @holdpoint/types@0.1.0-alpha.5

## 0.1.0-alpha.6

### Patch Changes

- Fix workspace:\* protocol leaking into published npm packages

  All packages were published via `npm publish` which does not convert pnpm's
  `workspace:*` dependency protocol to real version numbers. Switched CI to
  `pnpm publish --no-git-checks` which performs this conversion automatically.
  All packages need a version bump so clean tarballs can be published to npm.

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

## 0.1.0-alpha.4

### Patch Changes

- feat: builder UI overhaul (list view with categories, check run history), CLI bundles builder, check reports written to disk
- Updated dependencies
  - @holdpoint/types@0.1.0-alpha.4

## 0.1.0-alpha.3

### Patch Changes

- feat: SHA commit cache, session.log progress feedback, async npm publish workflow
- Updated dependencies
  - @holdpoint/types@0.1.0-alpha.3
