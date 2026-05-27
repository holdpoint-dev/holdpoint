# @holdpoint/types

## 0.1.0-alpha.9

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

## 0.1.0-alpha.8

### Patch Changes

- e861761: templates: single unified default.yaml replaces per-stack files

  BREAKING (alpha): `holdpoint init --stack` is removed. `init` now
  installs a single templates/default.yaml whose checks are gated on
  `when:` path scopes and `conditionId:` file-existence markers, so
  only relevant checks fire on any given change. Adding support for
  a new stack means adding a condition + a gated check, not forking
  a template.

## 0.1.0-alpha.7

### Patch Changes

- feat: ship Holdpoint Live foundation, daemon, UI, and adapter SDK

  This release publishes the first Holdpoint Live packages and wires the CLI to
  start, inspect, and emit live session events. It also updates the Claude and
  Copilot integrations plus the shared protocol/types used by the live daemon.

## 0.1.0-alpha.6

### Patch Changes

- Rewrite Copilot extension to delegate to the CLI instead of inlining check logic

  The generated extension.mjs shrank from 329 lines to 39. Instead of duplicating
  matchesWhen(), runCheck(), commit cache, staged-file detection, and auto-sync logic,
  the extension now shells out to `npx holdpoint@alpha check --staged` (or the
  configured engines.copilot.check_command override). The engine-when-sync check in
  checks.yaml is removed — it existed only to keep the two copies in sync.

  Adds engines.copilot.check_command to the checks.yaml schema, consistent with the
  engines.claude.stop_command and engines.codex.stop_command added previously.

## 0.1.0-alpha.5

### Patch Changes

- Add engines.claude.stop_command and engines.codex.stop_command to checks.yaml schema

  Engine-generated hook files now read an optional `engines.claude.stop_command` /
  `engines.codex.stop_command` from checks.yaml and embed it instead of the hardcoded
  `npx holdpoint@alpha check --staged`. This survives `holdpoint update` re-runs — the
  override lives in checks.yaml, not in the generated files.

  The holdpoint monorepo uses this to install itself as a workspace devDep and invoke
  `node_modules/.bin/holdpoint check --staged` locally instead of downloading from npm.

## 0.1.0-alpha.4

### Minor Changes

- feat: builder UI overhaul (list view with categories, check run history), CLI bundles builder, check reports written to disk

## 0.1.0-alpha.3

### Patch Changes

- feat: SHA commit cache, session.log progress feedback, async npm publish workflow
