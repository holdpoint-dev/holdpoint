# @holdpoint/live-daemon

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
