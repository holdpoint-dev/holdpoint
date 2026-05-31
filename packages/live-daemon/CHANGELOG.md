# @holdpoint/live-daemon

## 0.1.0-alpha.6

### Minor Changes

- 8274725: unify: fold the Builder into the Live dashboard — one UI to edit + monitor all repos

  The standalone Builder is gone as a separate app. Its check editing now lives as
  two tabs inside the unified Live dashboard, so there is a single UI (one bundle,
  one auth flow, one localhost port) for watching agents **and** editing every
  repo's `checks.yaml`:
  - **Checks tab** — a dense master-detail editor (replacing the old card grid),
    scoped to the project selected in the sidebar. The left list shows checks
    grouped by Automatic / Manual; clicking one opens a detail panel where the
    filter and condition are labeled **dropdowns** ("Runs on", "Only if") instead
    of ambiguous colored tags, with plain-language help text. Loads that repo's
    `checks.yaml`, supports Export / Copy / Load template, and a **Save** that
    writes back to disk.
  - **History tab** — the check-run report timeline for the selected project.
  - **Save with diff confirm** — Save opens a YAML diff of on-disk vs. edited and
    only writes after you approve it.

  Daemon changes:
  - New authenticated `PUT /__holdpoint/checks?project=<hash>` endpoint. It
    validates the body against the Holdpoint schema (`@holdpoint/yaml-core`) and
    writes `checks.yaml` atomically (temp file + rename) within the project root.
  - `/builder` and `/builder/` now `302` to `/live/?tab=checks`; the daemon no
    longer bundles or serves a separate builder UI (one bundle ships).
  - `holdpoint build` opens the unified UI's Checks tab.

  `apps/builder` source is retained but is no longer built into the shipped daemon.

### Patch Changes

- a6d38b3: live UI: full redesign on Radix UI primitives with task-focused tabs

  The Holdpoint Live monitoring UI (served by the daemon at `/live/`, bundled
  into `@holdpoint/live-daemon`) has been rebuilt from a single cramped pane into
  a clean, tabbed interface built on Radix UI + a shadcn-style component layer
  (the same stack the builder app already uses: `class-variance-authority`,
  `tailwind-merge`, `clsx`, `lucide-react`).
  - **Project sidebar** with live connection status and a per-project badge that
    surfaces the count of pending approvals at a glance.
  - **Activity tab** — a tone-coded, icon-led event timeline with per-type filter
    chips (and counts) so a noisy stream is scannable.
  - **Sessions tab** — one control card per session: status, last event, and the
    approve / deny / inject-context / trigger-dry-run controls, gated on session
    capabilities.
  - **Conflicts tab** — a dedicated view for "two agents reached for the same
    file," grouped by file with a clear holder → requester rendering.
  - **Health tab** — gate-effectiveness metrics derived from the event history
    (Stop-gate pass rate, check pass rate, tool success rate, conflicts, average
    Stop duration) plus the top failing checks.

  Internally the monolithic `App.tsx` was split into a `useLiveStore` hook
  (REST bootstrap + hydration + WebSocket stream), pure `lib/` helpers
  (`events`, `format`, `api`), reusable `components/ui` primitives, and one
  component per tab. No protocol or daemon API changes — purely a presentation
  overhaul.

- Updated dependencies [f160564]
- Updated dependencies [5d6f990]
  - @holdpoint/yaml-core@0.1.0-alpha.11

## 0.1.0-alpha.5

### Patch Changes

- e362a22: daemon: stop bricking startup when pending events reference deleted paths

  Two-layer fix for the silent failure mode where `holdpoint live` and
  `holdpoint builder` would hang for 5 seconds and then throw "Daemon
  unavailable + cannot spawn" because the daemon process crashed during
  startup with `ENOENT: no such file or directory, lstat ...`.

  Root cause: the daemon replays pending events from
  `~/.holdpoint/spool/pending/` on startup. Each event triggers
  `identifyProject(cwd)` which called `realpathSync(cwd)`. If the event
  referenced a project directory that had since been renamed or deleted,
  the lstat would throw ENOENT and bring down the whole replay — and
  with it the daemon startup. The bricked state was permanent: every
  subsequent daemon spawn re-replayed the same bad event and re-crashed.

  Layer 1 — `identifyProject` now has three fallbacks:
  1. git rev-parse --show-toplevel + realpath (canonical)
  2. realpath(cwd) (cwd exists, not a repo)
  3. raw cwd string (cwd deleted — was throwing)

  Layer 2 — `replayPending` now wraps each event in try/catch and always
  deletes the file at the end, so a malformed payload can't cause an
  infinite-loop brick. Failed events are logged with a `[holdpoint]`
  prefix and dropped.

  Includes regression tests for both layers — see
  `packages/live-daemon/src/__tests__/project-identity.test.ts` and the
  `LiveStore.replayPending` describe block in `store.test.ts`.

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
