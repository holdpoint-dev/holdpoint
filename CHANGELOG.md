# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- **Rename: Sentinel → Holdpoint** — full monorepo rename across all packages, configs, templates, docs, and generated files:
  - npm scope changed from `@sentinel/*` to `@holdpoint/*`
  - CLI binary renamed from `sentinel` to `holdpoint`
  - GitHub org/repo updated to `holdpoint-dev/holdpoint`
  - Install URL updated to `holdpoint.dev/install.sh`
  - All `.github/sentinel/` paths moved to `.github/holdpoint/`
  - Hook files renamed: `sentinel.json` → `holdpoint.json`, `sentinel-check.mjs` → `holdpoint-check.mjs`
  - ASCII banner in `install.sh` replaced with HOLDPOINT banner

### Added

- **`holdpoint evolve [--apply]` command** — zero-config self-evolving checks loop:
  - Scans the project filesystem to build a `ProjectProfile` (languages, frameworks, linters, test runners, DB, infra, CI).
  - Diffs the profile against the current `checks.yaml` and proposes new checks from a built-in template library (19 templates covering TypeScript, Python, Go, database, OpenAPI, infra, frontend, and universal guardrails).
  - Detects stale checks whose `when:` regex matches zero tracked files and wraps them with a `conditionId: file_exists` condition so they auto-skip when the path is absent.
  - `--apply` writes all proposals to `checks.yaml` and runs `holdpoint update` to regenerate engine files — no interactive prompts, safe for agent automation.
  - Idempotent: re-running after `--apply` prints "fully in sync".
- **`MASTER_PROMPT.md` evolve loop section** — instructs agents to run `holdpoint evolve --apply` when the project structure changes (new deps, new file types, deleted components), closing the zero-config evolution cycle.
- **`no-todos` universal prompt check** in `templates/_base.yaml` — reminds agents to resolve or track any TODO/FIXME/HACK comments before committing.
- **`holdpoint-evolve` prompt check** in holdpoint's own `checks.yaml` — fires when manifest files (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Dockerfile`, `*.tf`) change, reminding the agent to run `holdpoint evolve --apply`.

### Added (named `when:` patterns)

- **Named `when:` pattern registry** — `checks.yaml` now supports a top-level `patterns:` map where users define project-specific named aliases for JavaScript regexes. Checks can reference patterns by name instead of raw regex strings, improving readability.
  - Built-in scope names (`frontend`, `structural`, etc.) are protected — `patterns:` entries that collide are rejected at validation time with a clear error.
  - Pattern values are validated as syntactically-correct JavaScript regexes at parse time.
  - The canvas store preserves `patterns:` on round-trips through the visual builder.
- **`structural` built-in scope** — a new named `when:` scope that fires when files signalling a toolchain or dependency graph shift are changed: `package.json`, `tsconfig*.json`, `go.mod`, `Cargo.toml`, `Dockerfile*`, `docker-compose.*`, `*.tf`, `prisma/schema.prisma`, `openapi.*`, `.github/workflows/*.yml`, `vitest/jest/playwright` configs, linter configs, `next.config.*`, and more (~40 glob patterns).
- **`holdpoint-evolve` restored with `when: structural`** — the evolve check is back in `checks.yaml` and all starter templates, now using the human-readable `when: structural` scope instead of a 120-character raw regex.
- **Named patterns in Holdpoint's own `checks.yaml`** — raw regexes replaced with named aliases (`checks-file`, `builder-src`, `templates-src`, `lib-src`) for readability.

- **`/docs` page in `apps/web`** — comprehensive documentation covering: introduction, how Holdpoint works across different agent types, installation, full `checks.yaml` schema reference, all 15 `when:` scopes with file patterns, supported agents (Copilot CLI, Claude Code, Cursor) with generated file details, visual builder guide, CLI command reference, stack templates table, and advanced topics (conditions, custom regex, multi-agent, `session_context_files`).
- **`docs-sync` prompt check** in `checks.yaml` — fires when `packages/*/src/` or `templates/` change, reminding the agent to keep the `/docs` page in sync.
- **"Docs" link** added to the landing page navigation bar.

### Changed

- **Agent-agnostic language** throughout the builder and landing page:
  - `TriggerNode.tsx`: hardcoded `"on: before_done"` label replaced with dynamic `"hook · {event}"` using human-readable names (`task complete`, `before commit`, `on complete`).
  - `canvas.ts`: trigger node labels changed from `"on: before_done"` to `"task complete"` (agent-neutral).
  - `ListView.tsx` `HOOK_LABELS`: `"Before Done"` → `"Task Complete"` for the `before_done` hook.
  - Landing page `AGENTS` badges rewritten: `"extension.mjs"` → `"beforeTaskComplete hook"`, `"settings.json hooks"` → `"Stop / PostToolUse hooks"`, `".cursorrules"` → `".cursorrules injection"`.
  - `layout.tsx` metadata description updated to emphasize any-agent support.
- **Landing page code example** updated from legacy YAML syntax (`trigger:`, `deterministic:`, `manual:`) to the current `checks:` + `when:` format.

### Added

- **15 named `when:` scopes** — expanded from 5 to 15 built-in file-scope filters so 80%+ of GitHub repos are covered without writing custom regex:
  - **Language scopes**: `python`, `go`, `rust`, `java`, `ruby`
  - **Cross-cutting scopes**: `database` (SQL, migrations, all ORMs), `testing` (test/spec files), `infra` (Docker, Terraform, K8s), `ci` (GitHub Actions, CircleCI, GitLab CI), `docs` (MDX, RST, docs/)
  - Existing scopes retained: `frontend`, `backend`, `prisma`, `socket`, `visual`
- **`go` stack template** (`templates/go.yaml`) — `go build`, `go vet`, `go test` cmd checks + GoDoc and test coverage prompts, all scoped to `when: go`.
- **Go stack detection** — `holdpoint init` now auto-detects Go projects via `go.mod` and selects the `go` template.
- **`WhenScope` and `StackType` expanded** in `@holdpoint/types` to include all new scopes and `"go"` stack.
- **Builder UI**: all 15 scopes available in Graph and List view `when:` dropdowns with distinct colour-coded badges.
- **26 tests** in `yaml-core` (was 8) — covers positive and negative cases for every new scope, including root-level and nested path matching.

### Changed

- **`python.yaml` template**: Python-specific checks (`ruff`, `mypy`, `pytest`, docstrings, type-hints) now use `when: python` — they only fire when Python files change, which is correct in polyglot repos.
- **`fullstack.yaml` template**: migration check changed from `when: prisma` → `when: database` with an ORM-agnostic prompt (works with Prisma, Alembic, Rails, etc.).
- **`Toolbar.tsx` inline templates** synced with all template file changes; Go added to the stack picker.
- **`templates/MASTER_PROMPT.md`** `when:` reference table updated with all 15 named scopes and their glob patterns.
- **engine-copilot regex anchoring improved**: directory scope patterns now use `(^|\/)name\/` instead of `\/name\/` to correctly match root-level paths like `migrations/001.sql`.

- **Builder: List view** — second view mode in the visual builder that displays `checks.yaml` as hook sections (grouped by `on` hook, then by `when` filter). Toggle between Graph and List views via the toolbar icon buttons.
- **Builder: List view editing** — checks can be created, edited, and deleted directly from the list view without switching to the graph canvas. Edit dialog supports label, type (cmd/prompt), command/prompt content, file filter (`when`), and condition ID. Changing `when` automatically rewires the graph edges. Delete requires a two-step confirmation.
- **Builder: Add check from list view** — "Add" button on each hook section and filter sub-header creates a new check node pre-scoped to the correct trigger and filter group.
- **`getCheckEntries`** exported from `@holdpoint/builder` store — single-pass function returning checks with their canvas node IDs for bidirectional list↔graph sync.
- **`updateCheckNode`** store action — atomically updates check content, type, and filter rewiring in one operation.
- **`addCheckToGroup`** store action — creates a check node connected to the correct trigger/filter, creating those nodes if absent.
