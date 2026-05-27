# holdpoint

## 0.1.0-alpha.18

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
  - @holdpoint/cli@0.1.0-alpha.18

## 0.1.0-alpha.17

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

- 86ad6d5: Claude: use more of Claude Code's hook surface

  Claude settings now inject configured session context at `SessionStart`, emit best-effort Live events for prompt/tool/permission/notification/subagent/compaction/session lifecycle hooks, and wrap completion checks so failures exit 2 and keep Claude in the loop. `holdpoint init` and `holdpoint update` now merge Holdpoint-managed Claude hooks into existing `.claude/settings.json` instead of replacing user hooks.

- 882145a: templates: guide changelog edits back to changesets

  The default template now detects `CHANGELOG.md` edits in changesets-based projects and asks agents to move release notes into `.changeset/*.md` instead of hand-editing generated changelogs.

- 882145a: codex: expand native hook coverage and Live telemetry

  Codex now gets project hooks for prompt, tool, permission, compaction, subagent, and stop events. Holdpoint streams best-effort Live telemetry, injects bounded session/subagent context, and gates both `Stop` and `SubagentStop` while avoiding permission auto-approval.

- 93230de: cursor: install native project hooks for runtime enforcement

  Cursor now receives `.cursor/hooks.json` and `.cursor/holdpoint-hook.mjs` in addition to the contextual `.cursorrules` block. The hooks inject configured session context, stream Cursor lifecycle/tool events into Holdpoint Live, and run Holdpoint checks on local `stop` / completed `subagentStop` events with automatic follow-up messages when checks fail.

- ab18bdf: cursor: keep `.cursorrules` updates idempotent

  Regenerating Holdpoint engine files no longer accumulates blank lines before the generated `.cursorrules` block.

- 18e0865: templates: add default agent git workflow guidance

  The default template now includes `MASTER_PROMPT.md` as session context and adds
  a prompt check that tells agents when to use a branch + PR, when to commit
  directly on the current branch, and when pushing is useful versus leaving a
  local commit for handoff.

- f578ba8: Copilot: harden completion gating and Live context

  The Copilot extension now bounds session-context and check-output injection, uses safer repo-root path containment for `session_context_files`, emits Live `stop_pass` / `stop_block` events for `task_complete` gates, and surfaces context truncation as a Live meta event.

- 84c3d44: ci/dx: self-enforcement parity with the tool's own guarantees

  CI now runs `pnpm format:check` and `holdpoint check` so every PR
  passes the same gates Holdpoint enforces on AI agents. Pre-commit
  hook (husky) runs `holdpoint check --staged` on every human commit.
  Dependabot is enabled for weekly npm + GitHub Actions updates. Node
  version is pinned via .nvmrc (24) across all workflows. The
  `no-todos` check is now a hard cmd instead of an agent-only prompt.

- e861761: templates: single unified default.yaml replaces per-stack files

  BREAKING (alpha): `holdpoint init --stack` is removed. `init` now
  installs a single templates/default.yaml whose checks are gated on
  `when:` path scopes and `conditionId:` file-existence markers, so
  only relevant checks fire on any given change. Adding support for
  a new stack means adding a condition + a gated check, not forking
  a template.

- ad2645e: Surface cleanup before beta: vocabulary, command names, and bare-binary behavior
  - `holdpoint` with no subcommand now prints help instead of silently opening the
    browser UI. Use `holdpoint live` (already existed) to open Holdpoint Live —
    this matches every other CLI's bare-invocation convention and stops scripts
    from accidentally launching a browser tab.
  - `holdpoint suggest` is the new name for `holdpoint evolve`. `evolve` keeps
    working as a hidden alias and prints a one-line deprecation notice to stderr
    before delegating; it will be removed before 1.0.
  - User-facing docs and CLI strings now consistently say "engine" instead of
    "adapter" wherever the two were used interchangeably. The literal public
    contracts — the `holdpoint.adapter` `package.json` field, the `adapter` JS
    export from external engine packages, and the `LiveAdapter` SDK type — are
    unchanged. Third-party engines built against the existing contract require
    no code changes.

- Updated dependencies [42a9a4f]
- Updated dependencies [86ad6d5]
- Updated dependencies [882145a]
- Updated dependencies [882145a]
- Updated dependencies [93230de]
- Updated dependencies [ab18bdf]
- Updated dependencies [18e0865]
- Updated dependencies [8bb895f]
- Updated dependencies [84c3d44]
- Updated dependencies [e861761]
- Updated dependencies [37031fb]
- Updated dependencies [ad2645e]
  - @holdpoint/cli@0.1.0-alpha.17

## 0.1.0-alpha.16

### Minor Changes

- feat: ship Holdpoint Live foundation, daemon, UI, and adapter SDK

  This release publishes the first Holdpoint Live packages and wires the CLI to
  start, inspect, and emit live session events. It also updates the Claude and
  Copilot integrations plus the shared protocol/types used by the live daemon.

### Patch Changes

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.16

## 0.1.0-alpha.15

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

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.15

## 0.1.0-alpha.14

### Patch Changes

- Generate .codex/config.toml with [features] hooks = true

  Hooks are enabled by default in Codex, but writing this explicitly at the
  repo level prevents accidental user-level `hooks = false` from silently
  disabling holdpoint enforcement without any visible signal.

  init writes the file unconditionally (fresh install). update checks for an
  existing [features] section — if absent it appends the fragment, if present
  it trusts the user's existing setting rather than overwriting.

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.14

## 0.1.0-alpha.13

### Patch Changes

- Fix engine-codex to match Codex hooks spec

  Two bugs fixed in the Stop hook script:
  1. stdio: "inherit" → "pipe" — CLI output was leaking to hook stdout as plain
     text, which the Codex Stop spec explicitly forbids ("plain text output is
     invalid for this event"). With inherit, err.stdout/err.stderr were also always
     empty on failure so check output was never surfaced.
  2. Exit 0 with no stdout on success; exit 2 with captured stderr on failure.
     Codex uses the stderr text as the continuation prompt so the agent iterates.

  Also adds SessionStart hook support: when session_context_files are configured,
  a SessionStart entry is added to hooks.json. The same script (holdpoint-check.mjs)
  handles both events by reading hook_event_name from Codex's JSON stdin and
  dispatching accordingly. SessionStart outputs hookSpecificOutput.additionalContext
  JSON per the Codex spec (plain text is also valid for SessionStart, but JSON is
  explicit and forward-compatible).

  Fixes misleading comment about config.toml — Codex warns if both hooks.json and
  inline [hooks] exist in the same config layer. Users should use a separate JSON
  file for their own hooks, not mix into config.toml.

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.13

## 0.1.0-alpha.12

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

- Updated dependencies
  - @holdpoint/cli@0.1.0-alpha.12

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
