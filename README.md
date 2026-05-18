# Sentinel

> **Universal eval-guard for AI coding agents.** Enforce deterministic checkpoints before any agent commits or marks a task done.

[![CI](https://github.com/HarzerHeribert/sentinel/actions/workflows/ci.yml/badge.svg)](https://github.com/HarzerHeribert/sentinel/actions/workflows/ci.yml)

## What is Sentinel?

Sentinel enforces a `checks.yaml` file that defines what must pass before an agent can commit or mark a task done. It works with GitHub Copilot CLI, Claude Code, Cursor, and others — with a single config file and a one-command install.

```bash
curl -fsSL https://raw.githubusercontent.com/HarzerHeribert/sentinel/main/install.sh | sh
```

Or with npx:

```bash
npx sentinel@latest init
```

## Windows

Use WSL2. Then run the standard install command.
Native Windows support planned — contributions welcome.

## How it works

1. **`checks.yaml`** at your project root defines deterministic (shell) and manual (agent-confirmed) checks.
2. **Trigger matching** — checks only activate for relevant file types (frontend, backend, prisma, etc.)
3. **Engine adapters** — Copilot CLI gets `extension.mjs`, Claude Code gets `.claude/settings.json` hooks, Cursor gets `.cursorrules` additions.
4. **Visual builder** — `npx sentinel build` opens a node canvas to build your `checks.yaml` without writing YAML. Switch between **Graph view** (interactive node canvas) and **List view** (hook sections with inline editing) using the toolbar toggle.

## Quick start

```bash
# In your project root (git repo required)
npx sentinel init --stack=typescript

# Run checks manually
npx sentinel check

# Scan the project and propose new checks (dry run)
npx sentinel evolve

# Apply proposals and regenerate engine files
npx sentinel evolve --apply

# Open the visual builder
npx sentinel build

# Validate your checks.yaml
npx sentinel validate
```

## CLI commands

| Command                             | Description                                            |
| ----------------------------------- | ------------------------------------------------------ |
| `sentinel init [--stack] [--agent]` | Install Sentinel — detects stack + agent automatically |
| `sentinel check [--staged]`         | Run deterministic checks                               |
| `sentinel evolve [--apply]`         | Scan project and propose (or apply) new checks         |
| `sentinel validate`                 | Validate `checks.yaml` schema                          |
| `sentinel update`                   | Regenerate engine files from current `checks.yaml`     |
| `sentinel build`                    | Open the visual builder on `localhost:4321`            |

## Supported stacks

| Template     | Checks                                        |
| ------------ | --------------------------------------------- |
| `typescript` | eslint + tsc + vitest                         |
| `python`     | ruff + mypy + pytest                          |
| `nextjs`     | eslint + tsc + next build + visual regression |
| `fullstack`  | all of the above + openapi + playwright       |

## Supported agents

| Agent              | Mechanism                                              |
| ------------------ | ------------------------------------------------------ |
| GitHub Copilot CLI | `extension.mjs` — `beforeTaskComplete` hook            |
| Claude Code        | `.claude/settings.json` — `PostToolUse` + `Stop` hooks |
| Cursor             | `.cursorrules` — instruction injection                 |

## Monorepo structure

```
sentinel/
├── apps/
│   ├── builder/          ← React + Vite + React Flow visual canvas
│   └── web/              ← Next.js landing page
├── packages/
│   ├── cli/              ← npx sentinel CLI
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
