# Holdpoint

> ⚠️ **Alpha software** — `@holdpoint/*` packages are published to
> npm under the `alpha` tag only. APIs and config schema may change
> before 1.0. Feedback welcome via [GitHub Issues](https://github.com/holdpoint-dev/holdpoint/issues).

> **Universal eval-guard for AI coding agents.** Enforce deterministic checkpoints before any agent commits or marks a task done.

[![CI](https://github.com/holdpoint-dev/holdpoint/actions/workflows/ci.yml/badge.svg)](https://github.com/holdpoint-dev/holdpoint/actions/workflows/ci.yml)

## What is Holdpoint?

Holdpoint enforces a `checks.yaml` file that defines what must pass before an agent can commit or mark a task done. It works with GitHub Copilot CLI, Claude Code, Cursor, and others — with a single config file and a one-command install.

```bash
curl -fsSL https://holdpoint.dev/install.sh | sh
```

Or with npx:

```bash
npx @holdpoint/cli@alpha init
```

## Windows

Use WSL2. Then run the standard install command.
Native Windows support planned — contributions welcome.

## How it works

1. **`checks.yaml`** at your project root defines deterministic (shell) and manual (agent-confirmed) checks.
2. **Trigger matching** — checks only activate for relevant file types (frontend, backend, structural, etc.) — see [file filters](https://holdpoint.dev/docs#when-scopes)
3. **Engine adapters** — Copilot CLI gets `extension.mjs`, Claude Code gets `.claude/settings.json` hooks, Cursor gets `.cursorrules` additions.
4. **Visual builder** — `npx holdpoint build` opens a node canvas to build your `checks.yaml` without writing YAML. Switch between **Graph view** (interactive node canvas) and **List view** (hook sections with inline editing) using the toolbar toggle.

## Status

Holdpoint is in **early alpha**. What works today:

- Deterministic check enforcement on GitHub Copilot CLI
- Deterministic check enforcement on Claude Code (PostToolUse + Stop hooks)
- YAML schema + validation (`yaml-core` package, covered by tests)
- Stack auto-detection for TypeScript, Next.js, Python, Go, fullstack

What's incomplete:

- Cursor support is advisory; no hard block (see Supported agents above)
- Visual builder only runs from inside this monorepo
- Test coverage outside yaml-core is thin — help welcome
- npm-published API surface may change before 1.0

## Quick start

```bash
# In your project root (git repo required)
npx @holdpoint/cli@alpha init --stack=typescript

# Run checks manually
npx @holdpoint/cli@alpha check

# Scan the project and propose new checks (dry run)
npx @holdpoint/cli@alpha evolve

# Apply proposals and regenerate engine files
npx @holdpoint/cli@alpha evolve --apply

# Open the visual builder (monorepo only in alpha)
npx @holdpoint/cli@alpha build

# Validate your checks.yaml
npx @holdpoint/cli@alpha validate
```

## CLI commands

| Command                              | Description                                             |
| ------------------------------------ | ------------------------------------------------------- |
| `holdpoint init [--stack] [--agent]` | Install Holdpoint — detects stack + agent automatically |
| `holdpoint check [--staged]`         | Run deterministic checks                                |
| `holdpoint evolve [--apply]`         | Scan project and propose (or apply) new checks          |
| `holdpoint validate`                 | Validate `checks.yaml` schema                           |
| `holdpoint update`                   | Regenerate engine files from current `checks.yaml`      |
| `holdpoint build`                    | (monorepo-only, alpha) Open the visual builder          |

> `holdpoint build` currently only runs from inside the holdpoint
> monorepo. A hosted builder is planned.

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

| Agent              | Mechanism                                              |
| ------------------ | ------------------------------------------------------ |
| GitHub Copilot CLI | `extension.mjs` — `beforeTaskComplete` hook            |
| Claude Code        | `.claude/settings.json` — `PostToolUse` + `Stop` hooks |
| Cursor             | `.cursorrules` — advisory only (no block)              |

> Note: Copilot CLI and Claude Code support hard-blocking hooks.
> Cursor support writes instructions to `.cursorrules` but cannot
> stop the agent from proceeding — treat it as a strong nudge,
> not enforcement.

## Monorepo structure

```
holdpoint/
├── apps/
│   ├── builder/          ← React + Vite + React Flow visual canvas
│   └── web/              ← Next.js landing page
├── packages/
│   ├── cli/              ← npx holdpoint CLI
│   ├── engine-copilot/   ← Copilot CLI adapter
│   ├── engine-claude/    ← Claude Code adapter
│   ├── engine-cursor/    ← Cursor adapter
│   ├── yaml-core/        ← parser + validator + runner
│   └── types/            ← shared TypeScript types
├── templates/            ← starter checks.yaml per stack
└── install.sh            ← one-liner installer
```

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
