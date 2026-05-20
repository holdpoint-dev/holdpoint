# Holdpoint

> ⚠️ **Alpha software** — `@holdpoint/*` packages are published to
> npm under the `alpha` tag only. APIs and config schema may change
> before 1.0. Feedback welcome via [GitHub Issues](https://github.com/holdpoint-dev/holdpoint/issues).

> **Universal eval-guard for AI coding agents.** Enforce deterministic checkpoints before any agent commits or marks a task done.

[![CI](https://github.com/holdpoint-dev/holdpoint/actions/workflows/ci.yml/badge.svg)](https://github.com/holdpoint-dev/holdpoint/actions/workflows/ci.yml)

## What is Holdpoint?

Holdpoint enforces a `checks.yaml` file that defines what must pass before an agent can commit or mark a task done. It also ships Holdpoint Live, a local daemon + browser UI for watching sessions, conflicts, and check runs in real time. It works with GitHub Copilot CLI, Claude Code, Cursor, OpenAI Codex, and others — with a single config file and a one-command install.

### macOS / Linux

```bash
curl -fsSL https://holdpoint.dev/install.sh | sh
```

### Windows (PowerShell)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://holdpoint.dev/install.ps1 | iex"
```

Or with `npx` (cross-platform):

```bash
npx holdpoint@alpha init
```

> **GitHub Copilot CLI local use:** Holdpoint's `.github/extensions/holdpoint/extension.mjs`
> depends on the Copilot CLI `EXTENSIONS` feature. Today that feature requires experimental mode,
> so run `/experimental on` in Copilot CLI before using Holdpoint locally. `holdpoint init` and
> `holdpoint update` also create `HOLDPOINT_PREREQUISITES.md` with this note and other agent setup
> caveats.

## How it works

1. **`checks.yaml`** at your project root defines deterministic (shell) and manual (agent-confirmed) checks.
2. **Trigger matching** — checks only activate for relevant file types (frontend, backend, structural, etc.) — see [file filters](https://holdpoint.dev/docs#when-scopes)
3. **Engine adapters** — Copilot CLI gets `extension.mjs`, Claude Code gets `.claude/settings.json` hooks, Cursor gets `.cursorrules` additions, OpenAI Codex gets `.codex/hooks.json` + `AGENTS.md`.
4. **Visual builder** — `npx holdpoint builder` opens a browser UI to edit `checks.yaml` without writing YAML. Checks are organised into **Automated** (cmd), **Manual** (prompt), and **Conditions** sections, each grouped by `when` scope. The **History** tab shows the last 50 check run reports — including per-check pass/fail/skip results, changed files, and HEAD SHA.

## Status

Holdpoint is in **early alpha**. What works today:

- Deterministic check enforcement on GitHub Copilot CLI
- Deterministic check enforcement on Claude Code (TaskCompleted + Stop hooks, plus optional Live event hooks)
- Deterministic check enforcement on OpenAI Codex (Stop hook via `.codex/hooks.json`)
- Holdpoint Live Phase 1-5 core — local daemon, browser UI, project/session timeline, passive conflict detection, Copilot-only live control, and external live-adapter discovery
- YAML schema + validation (`yaml-core` package, covered by tests)
- Stack auto-detection for TypeScript, Next.js, Python, Go, fullstack
- Visual builder ships inside `@holdpoint/cli` — works for any installed user (`holdpoint builder`)
- Test coverage across engine packages, CLI detection, and the new Live foundation packages

What's incomplete:

- Cursor support is advisory; no hard block (see Supported agents above)
- Codex hooks require `codex trust` in TUI to activate project-level hooks
- Packages published to npm — `npx holdpoint@alpha init` or `npx @holdpoint/cli@alpha init`
- npm-published API surface may change before 1.0

## Live (alpha)

Holdpoint Live is the local observability layer for agent sessions. The current alpha ships:

- `holdpoint` (no args) and `holdpoint live` ensure the singleton daemon and open the browser UI
- `holdpoint daemon start|status|stop` manages the same singleton daemon explicitly
- `holdpoint event` ingests protocol events or converts native hook payloads through discovered live adapters
- `holdpoint engines [--json]` lists built-in and installed third-party live adapter packages plus ignore reasons
- The daemon serves a project-first browser UI with session cards, event filters, and a live timeline
- Passive conflict detection warns when two sessions in the same project target the same file path
- Claude hooks emit best-effort live events without turning observability into a new hard gate
- Copilot sessions register a persistent live bridge with pending approval controls, queued context injection, and a reference `holdpoint_dry_run` control tool
- `holdpoint check` emits `check_run` events into the daemon for a per-project check timeline

What is **not** shipped yet: generic external check-generation plugins, hook auto-spawn, and cross-agent context injection. Those remain tracked in `HOLDPOINT_LIVE_SPEC.md`.

## Quick start

```bash
# In your project root (git repo required)
npx holdpoint@alpha init --stack=typescript

# Run checks manually
npx holdpoint@alpha check

# Open Holdpoint Live for the current project
npx holdpoint@alpha

# Or start the daemon explicitly
npx holdpoint@alpha daemon start

# Scan the project and propose new checks (dry run)
npx holdpoint@alpha evolve

# Apply proposals and regenerate engine files
npx holdpoint@alpha evolve --apply

# Open the visual builder
npx holdpoint@alpha builder

# Validate your checks.yaml
npx holdpoint@alpha validate
```

## Local repository development

If you are working inside the Holdpoint monorepo itself:

```bash
# Marketing site + visual builder
make dev

# Marketing site only
make dev-web

# Visual builder only
make dev-builder

# Start/reuse the real Holdpoint Live daemon and open the browser UI
make dev-live
```

`make dev` is intentionally scoped to the standalone contributor-facing UIs. `make dev-live`
opens the daemon-served Live app, which is the same surface end users see via `holdpoint live`.

## CLI commands

| Command                              | Description                                                         |
| ------------------------------------ | ------------------------------------------------------------------- |
| `holdpoint`                          | Ensure the singleton daemon and open Holdpoint Live in the browser  |
| `holdpoint init [--stack] [--agent]` | Install for all agents by default; use `--agent` to restrict to one |
| `holdpoint check [--staged]`         | Run deterministic checks                                            |
| `holdpoint live [--project]`         | Open Holdpoint Live, optionally focused to a specific project hash  |
| `holdpoint engines [--json]`         | List discovered Holdpoint Live adapter packages and ignore reasons  |
| `holdpoint daemon start`             | Start or connect to the singleton Holdpoint Live daemon             |
| `holdpoint daemon status`            | Show daemon pid, port, uptime, and session count                    |
| `holdpoint daemon stop`              | Stop the running Holdpoint Live daemon                              |
| `holdpoint evolve [--apply]`         | Scan project and propose (or apply) new checks                      |
| `holdpoint event`                    | Internal: ingest live event JSON from stdin                         |
| `holdpoint validate`                 | Validate `checks.yaml` schema                                       |
| `holdpoint update`                   | Regenerate engine files from current `checks.yaml`                  |
| `holdpoint builder`                  | Open the visual builder on localhost:4321                           |

## Supported stacks

| Template     | Checks                                        |
| ------------ | --------------------------------------------- |
| `typescript` | eslint + tsc + vitest                         |
| `python`     | ruff + mypy + pytest                          |
| `nextjs`     | eslint + tsc + next build + visual regression |
| `fullstack`  | all of the above + openapi + playwright       |

## File filters (`when:`)

The `when:` field on a check limits it to specific file changes. Holdpoint ships 16 built-in named scopes:

| Scope        | Fires when                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `frontend`   | `**/*.tsx`, `**/*.jsx`, `**/*.css`, `apps/**`                                                                          |
| `backend`    | `**/api/**`, `**/server/**`, `packages/*/src/**`                                                                       |
| `structural` | `package.json`, `tsconfig*`, `Dockerfile*`, `*.tf`, config files — any file signalling toolchain or dependency changes |
| `testing`    | `**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`                                                                        |
| `database`   | `**/*.sql`, `**/migrations/**`, `**/prisma/**`                                                                         |
| `infra`      | `**/Dockerfile*`, `**/docker-compose.*`, `**/*.tf`                                                                     |
| `ci`         | `**/.github/workflows/**`, `**/.circleci/**`                                                                           |
| `docs`       | `**/*.mdx`, `**/*.rst`, `**/docs/**`                                                                                   |
| …            | `python`, `go`, `rust`, `java`, `ruby`, `prisma`, `socket`, `visual`                                                   |

You can also define project-specific named patterns in `checks.yaml`:

```yaml
patterns:
  api-routes: "^src/api/"
  openapi-spec: "openapi\\.(yaml|yml|json)$"

checks:
  - id: openapi-lint
    label: "Lint OpenAPI spec"
    when: openapi-spec
    cmd: "npx redocly lint openapi.yaml"
```

Pattern values are JavaScript regexes. Built-in scope names cannot be overridden.

## Supported agents

| Agent              | Mechanism                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| GitHub Copilot CLI | `extension.mjs` — persistent SDK extension for `task_complete` gating, Live observability, and Copilot-only Live control |
| Claude Code        | `.claude/settings.json` — `PreToolUse` / `PostToolUse` live events + `TaskCompleted` / `Stop` gates                      |
| Cursor             | `.cursorrules` — advisory only (no hard block)                                                                           |
| OpenAI Codex       | `.codex/hooks.json` + `AGENTS.md` — `Stop` hook blocks on exit 2                                                         |

> **All four agents are installed by default.** Since each adapter writes to its own directory, they coexist without conflict. Use `--agent=copilot|claude|cursor|codex` to restrict to one.

> **Copilot note:** local Holdpoint enforcement uses `.github/extensions/holdpoint/extension.mjs`, which depends on Copilot CLI experimental mode today. Run `/experimental on` so the `EXTENSIONS` feature is enabled before using Holdpoint locally.

> **Codex note:** Project-level hooks require trust approval — run `codex trust` in the Codex TUI or use `/hooks` to review and approve. User-level hooks in `~/.codex/` are trusted automatically.

## External Live adapters (alpha)

Holdpoint now supports third-party **Live hook adapters** without a Holdpoint repo PR. The current contract is intentionally narrow: an external package can translate its native hook payloads into Holdpoint events and provide the bridge command string that its host tool should run.

The CLI discovers:

- built-in adapter packages bundled with Holdpoint
- installed project packages named `holdpoint-engine-*` or `@scope/holdpoint-engine-*`

Each package must include the `holdpoint-engine` keyword plus this `package.json` metadata:

```json
{
  "holdpoint": {
    "manifest": "./dist/manifest.js",
    "adapter": "./dist/index.js"
  }
}
```

The manifest module exports:

```js
export const manifest = {
  manifestVersion: 1,
  id: "my-engine",
  displayName: "My Engine",
};
```

The adapter module exports:

```js
export const adapter = {
  id: "my-engine",
  displayName: "My Engine",
  capabilities: { can_stream: true },
  generateBridgeCommand() {
    return "node_modules/.bin/holdpoint event --engine my-engine --from-hook";
  },
  translateHookInput(raw, options) {
    // Return a Holdpoint EventV1 or null when the hook payload is irrelevant.
    return null;
  },
};
```

Use `holdpoint engines` to inspect what loaded and why, and see `examples/holdpoint-engine-template/` for a minimal package skeleton.

## Monorepo structure

```
holdpoint/
├── apps/
│   ├── builder/          ← React + Vite visual editor (list + history view)
│   ├── live/             ← React + Vite Holdpoint Live UI bundled into the daemon
│   └── web/              ← Next.js landing page + public installers
│       └── public/       ← install.sh + install.ps1 bootstrap scripts
├── examples/
│   └── holdpoint-engine-template/ ← minimal external Live adapter package skeleton
├── packages/
│   ├── cli/              ← npx holdpoint CLI
│   ├── live-daemon/      ← singleton local daemon for Holdpoint Live
│   ├── live-protocol/    ← versioned event / HTTP / WS schema
│   ├── sdk/              ← bridge client + adapter interface
│   ├── engine-copilot/   ← Copilot CLI adapter
│   ├── engine-claude/    ← Claude Code adapter
│   ├── engine-cursor/    ← Cursor adapter
│   ├── engine-codex/     ← OpenAI Codex adapter
│   ├── yaml-core/        ← parser + validator + runner
│   └── types/            ← shared TypeScript types
├── templates/            ← starter checks.yaml per stack
```

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## Publishing (maintainers)

Packages are published automatically via GitHub Actions (`.github/workflows/release.yml`) using the [Changesets](https://github.com/changesets/changesets) workflow:

1. **Create a changeset** describing your changes: `pnpm changeset`
2. **Merge to `main`** — the release workflow opens a "Version Packages" PR automatically.
3. **Merge the Version Packages PR** — the workflow bumps versions, updates CHANGELOGs, and publishes to npm.

**Required GitHub secret:** `NPM_TOKEN` — a token with publish access to the `@holdpoint` npm scope. Add it at _Settings → Secrets → Actions_ in the GitHub repo.

Local publish (maintainer with passkey): `make publish`

## License

MIT — see [LICENSE](LICENSE).
