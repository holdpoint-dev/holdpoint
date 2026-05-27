# @holdpoint/engine-copilot

## 0.1.0-alpha.14

### Patch Changes

- 8d24ea1: release: single-track publishing — drop the `alpha` dist-tag, use `latest` only

  We're a solo-maintained pre-1.0 project with no parallel release tracks
  (no LTS, no beta, no stable-being-patched-while-experiments-ship). Two
  dist-tags (`latest` + `alpha`) only bought us complexity: every release
  required either a workflow that synced both (which silently broke under
  OIDC trusted publishing, since OIDC tokens don't authorize subsequent
  `npm dist-tag add` calls) or manual repair commands after each publish.

  This bump moves everyone to single-track `latest`-only publishing:
  - `publishConfig.tag` removed from all 11 package.json files (npm
    defaults to `latest` when unset).
  - `.github/workflows/publish.yaml` was already simplified to publish
    with `--tag latest` only; the dist-tag sync block is gone.
  - `scripts/publish.sh` (local manual publish) drops the dist-tag sync.
  - `install.sh`, `install.ps1`, README, web app, and CLI install
    instructions now use `npx holdpoint` (no `@alpha` suffix).
  - The historical `alpha` dist-tag on npm is left pointing at the last
    alpha-tagged version (`0.1.0-alpha.16`) as a breadcrumb; remove
    manually with `npm dist-tag rm @holdpoint/<pkg> alpha` if desired.

  The version-string format stays `0.1.0-alpha.N` (we remain in
  `.changeset/pre.json` pre-release mode). "Alpha" is signaled by the
  version string, the README banner, and the alpha-software callouts —
  not by the dist-tag, which is just a default-resolver.

- Updated dependencies [8d24ea1]
  - @holdpoint/types@0.1.0-alpha.9

## 0.1.0-alpha.13

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

- f578ba8: Copilot: harden completion gating and Live context

  The Copilot extension now bounds session-context and check-output injection, uses safer repo-root path containment for `session_context_files`, emits Live `stop_pass` / `stop_block` events for `task_complete` gates, and surfaces context truncation as a Live meta event.

- Updated dependencies [e861761]
  - @holdpoint/types@0.1.0-alpha.8

## 0.1.0-alpha.12

### Patch Changes

- feat: ship Holdpoint Live foundation, daemon, UI, and adapter SDK

  This release publishes the first Holdpoint Live packages and wires the CLI to
  start, inspect, and emit live session events. It also updates the Claude and
  Copilot integrations plus the shared protocol/types used by the live daemon.

- Updated dependencies
  - @holdpoint/types@0.1.0-alpha.7

## 0.1.0-alpha.11

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

## 0.1.0-alpha.10

### Patch Changes

- Copilot engine: extension-only — remove shell hooks entirely

  The extension now handles both responsibilities in one file:
  - onSessionStart: reads checks.immutable.json (pre-parsed JSON — no YAML parser
    needed in plain .mjs) and injects session_context_files as additionalContext
  - onPreToolUse: intercepts task_complete, delegates to holdpoint CLI for checks

  The shell hooks system (.github/hooks/holdpoint.json + holdpoint-check.mjs) is
  removed. It existed because session context injection predated the extension, not
  because it was the right mechanism. The SDK extension is deterministic, runs as a
  persistent process over JSON-RPC, and handles both jobs cleanly.

  Copilot agent detection now looks for extension.mjs instead of holdpoint.json.

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
  - @holdpoint/types@0.1.0-alpha.6

## 0.1.0-alpha.8

### Patch Changes

- Updated dependencies
  - @holdpoint/types@0.1.0-alpha.5

## 0.1.0-alpha.7

### Patch Changes

- Fix workspace:\* protocol leaking into published npm packages

  All packages were published via `npm publish` which does not convert pnpm's
  `workspace:*` dependency protocol to real version numbers. Switched CI to
  `pnpm publish --no-git-checks` which performs this conversion automatically.
  All packages need a version bump so clean tarballs can be published to npm.

## 0.1.0-alpha.6

### Patch Changes

- Remove dead task_complete gating code from generated holdpoint-check.mjs

  The Copilot hooks script (.github/hooks/holdpoint-check.mjs) was carrying ~280 lines of check-running logic that was never reachable — holdpoint.json only registers it for sessionStart events, and task_complete interception is handled exclusively by extension.mjs via the Copilot SDK. The script is now sessionStart-only (62 lines vs 344).

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
