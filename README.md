# Holdpoint

> **AI coding agents skip your tests, miss your lints, and claim done on broken code. Holdpoint won't let them finish until the checks you wrote actually pass.**

[![CI](https://github.com/holdpoint-dev/holdpoint/actions/workflows/ci.yml/badge.svg)](https://github.com/holdpoint-dev/holdpoint/actions/workflows/ci.yml)

One `checks.yaml` at the root of your repo defines what must pass — lint, tests, types,
anything you can express as a shell command, a manual confirmation, or context to seed.
Holdpoint compiles that file into native hooks/extensions for **GitHub Copilot CLI, Claude
Code, OpenAI Codex, and Cursor**, so the same gates apply no matter which agent is driving.
It also ships **Holdpoint Live** — a local daemon + browser UI to watch sessions, edit
checks, and catch cross-agent file conflicts as they happen.

> ⚠️ **Alpha software.** `@holdpoint/*` packages publish to npm under the `alpha` tag only.
> APIs and the config schema may change before 1.0.

**This README is for people who want to develop and extend Holdpoint.** If you just want to
_use_ it, the user-facing docs live at **[holdpoint.dev/docs](https://holdpoint.dev/docs)**.

---

## Usage in 30 seconds

```bash
npx holdpoint init        # detect agents, write checks.yaml + engine files
npx holdpoint check       # run the checks yourself
npx holdpoint live        # open the dashboard: monitor + edit checks
```

After `init`, every supported agent in the repo is gated: it can't mark a task complete
until `holdpoint check` exits 0. Full usage, the `checks.yaml` reference, lifecycle hooks,
and `when:` file filters are documented at **[holdpoint.dev/docs](https://holdpoint.dev/docs)**.

---

## Architecture

```
checks.yaml ──► holdpoint update ──► per-engine artifacts ──► the agent's native hooks
     ▲                                                              │
     └──────────── edit in the Live UI (Checks tab) ◄── daemon ◄── live events
```

- **`checks.yaml`** is the single source of truth. `holdpoint update` compiles it into
  `.github/holdpoint/generated/checks.immutable.json` (read at runtime) plus each engine's
  native config. Generated files are committed and never hand-edited.
- **Engines** translate `checks.yaml` into each agent's hook surface and run
  `holdpoint check` at the right lifecycle points. Each writes to its own directory, so all
  four coexist.
- **Holdpoint Live** is a singleton local daemon that ingests events from every engine over
  a versioned protocol and serves one browser UI at `/live/`.

### Lifecycle hooks

A check declares **when** it runs (`on:`) and **what** it does (`cmd` / `prompt` / `inject`):

| `on:`                     | Behavior it pairs well with            | Engine support                                             |
| ------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| `session_start`           | `inject` (seed files/text/datetime)    | Claude, Codex, Cursor, Copilot                             |
| `message_submit`          | `inject`                               | Claude, Codex, Copilot (Cursor folds into `session_start`) |
| `before_tool`             | `cmd` (fails → blocks the tool)        | Claude, Codex, Cursor, Copilot                             |
| `before_done` _(default)_ | `cmd` / `prompt` (the completion gate) | all engines                                                |

Engines honor what their host supports and skip the rest. The matrix and per-engine notes
live in `HOLDPOINT_REFERENCE.md`.

### Monorepo layout

```
holdpoint/
├── apps/
│   ├── live/    ← React + Vite — the unified Live UI (bundled into the daemon)
│   ├── builder/ ← legacy standalone editor, superseded by the live app's Checks tab (not shipped)
│   └── web/     ← Next.js landing page + /docs + install scripts
├── packages/
│   ├── cli/            ← the `holdpoint` CLI
│   ├── types/          ← shared TypeScript types (source of truth for the schema shape)
│   ├── yaml-core/      ← parse / validate / generate checks.yaml + the check runner
│   ├── live-protocol/  ← versioned event / HTTP / WS schema (Zod)
│   ├── live-daemon/    ← singleton daemon: ingest, store, serve UI, write checks
│   ├── sdk/            ← BridgeClient + LiveAdapter contract for third-party engines
│   ├── engine-claude/  ├
│   ├── engine-codex/   ├─ one package per agent: compile checks.yaml → native hooks
│   ├── engine-cursor/  ├
│   └── engine-copilot/ ┘
├── templates/   ← the unified default checks.yaml + reference docs shipped by `init`
└── examples/    ← holdpoint-engine-template: minimal external Live engine
```

---

## Development

Prerequisites: **Node 20+** and **pnpm** (`corepack enable`).

```bash
pnpm install
pnpm turbo build      # build every package's dist/ (engines + CLI run from dist, not src)
pnpm turbo typecheck
pnpm turbo lint
pnpm turbo test       # vitest across all packages
pnpm format:check     # prettier
```

> **The golden rule:** the CLI and engines run from `dist/`, not `src/`. After editing any
> `packages/*/src/` file, run `pnpm turbo build` or you'll silently run stale code.

### Running the apps

```bash
make dev-live   # build + start the real daemon and open the unified Live UI (what users see)
make dev-web    # the Next.js marketing site + /docs
make dev        # web + the legacy builder app (contributor convenience only)
```

The shipped UI is `apps/live`, served by the daemon. `apps/builder` is the original
standalone editor, kept for reference but no longer bundled — its functionality moved into
the live app's **Checks** tab.

### Dogfooding & self-enforcement

This repo **is** a Holdpoint user: its own `checks.yaml` gates development here, and CI runs
`holdpoint check` as the "dogfood" step. Practical consequences when contributing:

- After changing `checks.yaml`, run `node packages/cli/dist/index.js update` and commit the
  regenerated engine files (the `holdpoint-sync` check enforces this).
- After changing `packages/types/src/index.ts`, mirror it in
  `packages/yaml-core/src/schema.ts` (the Zod schema), then rebuild.
- Any `packages/*` change needs a `.changeset/*.md` entry (the `require-changeset` check
  enforces this).
- Generated engine dirs (`.codex/`, `.cursor/`, `.github/extensions/`, `.claude/settings.json`)
  are produced by `holdpoint update` and are in `.prettierignore` — don't reformat them.

### Adding a check

Edit `checks.yaml`, then `holdpoint update`. A check is `{ id, label }` plus exactly one
behavior — `cmd` (shell command, blocks on non-zero), `prompt` (instruction surfaced to the
agent), or `inject` (`text` / `files` / `datetime` context) — and optional `on:` (lifecycle
hook), `when:` (file filter), and `conditionId:` (gate on a project condition).

### Working on an engine

Each `packages/engine-*` compiles `checks.yaml` into one agent's native hook surface. The
runtime dispatcher (a generated `.mjs`, or the Copilot SDK extension) reads
`checks.immutable.json` and, per hook, runs `holdpoint check --hook <event>` (gates) or emits
context (inject/prompt). Engines emit best-effort Live events via
`holdpoint event --engine <name> --from-hook`. Keep `buildEngine` output a function of
`checks.yaml` + which hooks the checks target — never of a check's command text — so editing
a check doesn't churn generated files. Engine behavior is covered by unit tests and, for the
script-based engines, functional tests that execute the generated dispatcher with mocked
payloads.

---

## CLI commands

| Command                                       | Description                                                     |
| --------------------------------------------- | --------------------------------------------------------------- |
| `holdpoint init [--agent]`                    | Install for all agents by default; `--agent` restricts to one   |
| `holdpoint check [--staged] [--hook <event>]` | Run checks for a lifecycle hook (default `before_done`)         |
| `holdpoint update`                            | Regenerate engine files from `checks.yaml`                      |
| `holdpoint validate`                          | Validate `checks.yaml` against the schema                       |
| `holdpoint live [--project]`                  | Open the unified Live UI (optionally focused to a project)      |
| `holdpoint builder`                           | Open the Live UI on the Checks editor tab (`/live/?tab=checks`) |
| `holdpoint daemon start\|status\|stop`        | Manage the singleton Live daemon                                |
| `holdpoint engines [--json]`                  | List discovered Live engine packages and ignore reasons         |
| `holdpoint suggest [--apply]`                 | Scan the project and propose (or apply) new checks              |
| `holdpoint require-changeset`                 | Require a `.changeset/*.md` for release-affecting changes       |
| `holdpoint event`                             | Internal: ingest a Live event from stdin                        |

---

## External Live engines

Third-party agents can join Holdpoint Live without a PR here. A package keyworded
`holdpoint-engine` (or named `holdpoint-engine-*` / `@scope/holdpoint-engine-*`) provides a
manifest + an adapter that translates its native hook payloads into Holdpoint events:

```json
{ "holdpoint": { "manifest": "./dist/manifest.js", "adapter": "./dist/index.js" } }
```

```js
export const adapter = {
  id: "my-engine",
  displayName: "My Engine",
  capabilities: { can_stream: true },
  generateBridgeCommand() {
    return "node_modules/.bin/holdpoint event --engine my-engine --from-hook";
  },
  translateHookInput(raw, options) {
    return null; // return a Holdpoint EventV1, or null to ignore this payload
  },
};
```

Depend on `@holdpoint/sdk` (the `LiveAdapter` contract) and `@holdpoint/live-protocol` (the
event schema). Run `holdpoint engines` to see what loaded and why; see
`examples/holdpoint-engine-template/` for a skeleton.

---

## Publishing (maintainers)

Releases run via GitHub Actions + [Changesets](https://github.com/changesets/changesets):

1. Add a changeset: `pnpm changeset`.
2. Merge to `main` — the release workflow opens a "Version Packages" PR.
3. Merge that PR — versions bump, CHANGELOGs update, packages publish to npm.

Requires the `NPM_TOKEN` GitHub secret (publish access to the `@holdpoint` scope). Local
publish (passkey): `make publish`.

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md). Deep references: `HOLDPOINT_REFERENCE.md`
(checks.yaml schema) and `HOLDPOINT_LIVE_SPEC.md` (Live design + progress).

## License

MIT — see [LICENSE](LICENSE).
