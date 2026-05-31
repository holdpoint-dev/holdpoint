# @holdpoint/yaml-core

## 0.1.0-alpha.11

### Minor Changes

- f160564: feat: configurable lifecycle hooks + a context-injection behavior (Claude, phase 1)

  Checks were previously hardwired to a single completion gate. They can now
  attach to lifecycle hook points and seed context — not just block at the end.

  Schema (`@holdpoint/types` + `@holdpoint/yaml-core`):
  - `on:` now accepts `session_start`, `message_submit`, `before_tool`,
    `after_tool`, `session_end`, and `before_done` (default, unchanged).
  - New `inject:` behavior alongside `cmd` and `prompt`: seed context as `text`,
    repo-relative `files`, and/or the current `datetime`. A check must set exactly
    one of `cmd` / `prompt` / `inject`.

  Runner / CLI:
  - `runDeterministicChecks` filters by hook; `holdpoint check --hook <event>`
    runs only the checks bound to that hook (default `before_done`, so existing
    behavior is unchanged).

  Claude engine (first engine, end-to-end):
  - `SessionStart` and `UserPromptSubmit` now emit context from `inject`/`prompt`
    checks bound to `session_start` / `message_submit` (plus the existing
    `session_context_files` and `inject_datetime`), via one hook-aware script.
  - `PreToolUse` runs a blocking `--hook before_tool` gate when a `cmd` check
    targets `before_tool`.
  - Hook wiring keys off config flags and which hooks the checks target, never off
    a check's command text, so editing a check doesn't churn `settings.json`.

  UI:
  - The Checks editor is reorganized around the model: the list is grouped by hook
    (Session start / Each message / Before a tool / Before finishing) and the
    detail panel segregates color-coded "When it runs", "What it does" (incl. the
    new Inject-context behavior), and "What triggers it" sections.
  - The Activity tab's filter pills are replaced by a category-grouped dropdown.

  Cursor, Codex, and Copilot parity is tracked as follow-up work; they continue to
  honor `before_done` and the existing top-level context seeding.

### Patch Changes

- 5d6f990: Inject current date and time into every prompt submission

  All four agent engines now inject the current date/time as `additionalContext` whenever a prompt is submitted. This prevents the common failure mode where models anchor their sense of "now" to their training knowledge cutoff and make stale assumptions.

  The feature is **on by default** — no config needed. To opt out, add `inject_datetime: false` to `checks.yaml`.

  **Agent support:**
  - Claude — `UserPromptSubmit` hook via `additionalContext`
  - Cursor — `beforeSubmitPrompt` hook via `additional_context`
  - Codex — `UserPromptSubmit` hook via `hookSpecificOutput.additionalContext`
  - Copilot — `onUserPromptSubmitted` hook via `additionalContext`

- Updated dependencies [f160564]
- Updated dependencies [5d6f990]
  - @holdpoint/types@0.1.0-alpha.10

## 0.1.0-alpha.10

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

## 0.1.0-alpha.9

### Patch Changes

- 8bb895f: Add `holdpoint require-changeset`, a smart release-note gate that discovers publishable package roots and fails when release-affecting package changes do not include a `.changeset/*.md` file. Starter templates now include this check so newly initialized projects get changeset enforcement automatically.

  Keep the Live protocol schemas compatible with the current Zod record API.

  Keep YAML validation errors compatible with the current Zod issue API.

  Keep daemon WebSocket validation errors compatible with the current Zod issue API.

- Updated dependencies [e861761]
  - @holdpoint/types@0.1.0-alpha.8

## 0.1.0-alpha.8

### Patch Changes

- feat: ship Holdpoint Live foundation, daemon, UI, and adapter SDK

  This release publishes the first Holdpoint Live packages and wires the CLI to
  start, inspect, and emit live session events. It also updates the Claude and
  Copilot integrations plus the shared protocol/types used by the live daemon.

- Updated dependencies
  - @holdpoint/types@0.1.0-alpha.7

## 0.1.0-alpha.7

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

## 0.1.0-alpha.6

### Patch Changes

- Add engines.claude.stop_command and engines.codex.stop_command to checks.yaml schema

  Engine-generated hook files now read an optional `engines.claude.stop_command` /
  `engines.codex.stop_command` from checks.yaml and embed it instead of the hardcoded
  `npx holdpoint@alpha check --staged`. This survives `holdpoint update` re-runs — the
  override lives in checks.yaml, not in the generated files.

  The holdpoint monorepo uses this to install itself as a workspace devDep and invoke
  `node_modules/.bin/holdpoint check --staged` locally instead of downloading from npm.

- Updated dependencies
  - @holdpoint/types@0.1.0-alpha.5

## 0.1.0-alpha.5

### Patch Changes

- Fix workspace:\* protocol leaking into published npm packages

  All packages were published via `npm publish` which does not convert pnpm's
  `workspace:*` dependency protocol to real version numbers. Switched CI to
  `pnpm publish --no-git-checks` which performs this conversion automatically.
  All packages need a version bump so clean tarballs can be published to npm.

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
