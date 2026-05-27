# @holdpoint/live-daemon

## 0.1.0-alpha.4

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
  - @holdpoint/live-protocol@0.1.0-alpha.4

## 0.1.0-alpha.3

### Minor Changes

- 37031fb: Unify the browser surface: `holdpoint builder` now reuses the singleton Holdpoint Live daemon and opens `/builder/` instead of running a separate `localhost:4321` server. The daemon serves `/live/` and `/builder/` routes and protects builder project bootstrap data behind the existing browser auth flow.

### Patch Changes

- 8bb895f: Add `holdpoint require-changeset`, a smart release-note gate that discovers publishable package roots and fails when release-affecting package changes do not include a `.changeset/*.md` file. Starter templates now include this check so newly initialized projects get changeset enforcement automatically.

  Keep the Live protocol schemas compatible with the current Zod record API.

  Keep YAML validation errors compatible with the current Zod issue API.

  Keep daemon WebSocket validation errors compatible with the current Zod issue API.

- Updated dependencies [8bb895f]
  - @holdpoint/live-protocol@0.1.0-alpha.3

## 0.1.0-alpha.2

### Minor Changes

- feat: ship Holdpoint Live foundation, daemon, UI, and adapter SDK

  This release publishes the first Holdpoint Live packages and wires the CLI to
  start, inspect, and emit live session events. It also updates the Claude and
  Copilot integrations plus the shared protocol/types used by the live daemon.

### Patch Changes

- Updated dependencies
  - @holdpoint/live-protocol@0.1.0-alpha.2
