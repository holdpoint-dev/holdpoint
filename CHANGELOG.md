# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **15 named `when:` scopes** — expanded from 5 to 15 built-in file-scope filters so 80%+ of GitHub repos are covered without writing custom regex:
  - **Language scopes**: `python`, `go`, `rust`, `java`, `ruby`
  - **Cross-cutting scopes**: `database` (SQL, migrations, all ORMs), `testing` (test/spec files), `infra` (Docker, Terraform, K8s), `ci` (GitHub Actions, CircleCI, GitLab CI), `docs` (MDX, RST, docs/)
  - Existing scopes retained: `frontend`, `backend`, `prisma`, `socket`, `visual`
- **`go` stack template** (`templates/go.yaml`) — `go build`, `go vet`, `go test` cmd checks + GoDoc and test coverage prompts, all scoped to `when: go`.
- **Go stack detection** — `sentinel init` now auto-detects Go projects via `go.mod` and selects the `go` template.
- **`WhenScope` and `StackType` expanded** in `@sentinel/types` to include all new scopes and `"go"` stack.
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
- **`getCheckEntries`** exported from `@sentinel/builder` store — single-pass function returning checks with their canvas node IDs for bidirectional list↔graph sync.
- **`updateCheckNode`** store action — atomically updates check content, type, and filter rewiring in one operation.
- **`addCheckToGroup`** store action — creates a check node connected to the correct trigger/filter, creating those nodes if absent.
