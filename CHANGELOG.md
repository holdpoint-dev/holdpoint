# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Vercel Analytics + Speed Insights** — added `@vercel/analytics` and `@vercel/speed-insights` to `apps/web`. Both components (`<Analytics />`, `<SpeedInsights />`) are rendered in the root layout so all pages are tracked automatically.

- **Automated npm publish pipeline** — new `.github/workflows/release.yml` using `changesets/action`. On every push to `main` the action either opens/updates a "Version Packages" PR (when changesets are pending) or publishes all changed packages to npm (when the PR is merged). Requires `NPM_TOKEN` secret in GitHub repo settings. Local `make publish` continues to use browser passkey; CI uses `NPM_TOKEN` via `npm_config_auth_type=legacy` override.
- **Version bump to `0.1.0-alpha.4`** — all packages bumped from alpha.3 to alpha.4 via `pnpm changeset version`.

### Changed

- **Unified Live + Builder browser surface** — `holdpoint builder` now opens the singleton Holdpoint Live daemon at `/builder/` instead of starting a second localhost server on `:4321`. The daemon serves `/live/` and `/builder/` as separate SPA routes, and builder bootstrap reads (`checks.yaml` + check history) are protected by the same browser auth cookie and registered project root.
- **Landing page polish + mobile responsiveness** — rebuilt the `apps/web` hero, feature, and CTA sections with richer visual hierarchy, clearer product framing, responsive stat/step cards, a stronger terminal preview, and a mobile-safe install command + supported-agents layout. Also set `metadataBase` to `https://holdpoint.dev` so Next.js resolves social preview URLs correctly during production builds.
- **Landing page copy simplified** — trimmed the homepage down to a darker, higher-whitespace layout with shorter copy, less product marketing language, and a clearer handoff to `/docs` for the full explanation.

## [0.1.0-alpha.4] — builder overhaul, publish automation

### Added

- **Check run history in the builder** — `holdpoint check` now writes rich check run reports to `.holdpoint/check-reports.json` (capped at 50 runs, newest-first). Each report records the HEAD SHA, timestamp, changed files, per-check results (`pass`/`fail`/`skip` for cmd checks; `shown` for prompt checks), and a counts summary. The builder's new **History** tab fetches these reports from a `/__holdpoint/initial-reports` dev-server endpoint and displays collapsible run cards — giving a clear audit trail of what Holdpoint verified each session.
- **Builder list view redesigned** — checks are now organised into **Automated Checks** (cmd), **Manual Checks** (prompt), and **Conditions**, each sub-grouped by their `when` scope. Every check card shows its command/prompt, when-badge, and an inline edit button. The categorisation makes it immediately clear what Holdpoint ships with vs. what the user has configured.
- **Builder bundled into `@holdpoint/cli`** — `holdpoint build` now works for any installed user. The pre-built React SPA (`apps/builder/dist/`) is copied into `packages/cli/dist/builder-ui/` at build time via a new `scripts/copy-builder.mjs` post-build step; `holdpoint build` serves these static files via a built-in Node HTTP server. No monorepo required.

### Changed

- **Builder graph view removed** — the React Flow node-canvas has been removed. The list view is now the sole editing interface. This eliminates the overlapping node layout and the data-loss bug where check IDs were regenerated on every export.
- **Builder store rewritten** — the internal data model is now `HoldpointConfig` directly (was React Flow `Node[]` + `Edge[]`). Check IDs are now stable slugs derived from the label (e.g. `eslint-no-warnings`) and preserved across export/import cycles.
- **`@xyflow/react` dependency removed** from the builder bundle.

— the Copilot extension (`extension.mjs`) now emits ephemeral `session.log()` messages while running checks (e.g. "Holdpoint: running TypeScript…"), producing the blue-dot status indicator in the Copilot CLI UI. Previously the extension ran checks silently. Mirrors the pattern from the predecessor eval-guard project.

- **`make publish` target + `scripts/publish.sh`** — new publish workflow for AI agents. Sets `auth-type=web` in `.npmrc` (browser/passkey auth) and documents the async-bash pattern: agent runs publish in async mode, sends `{enter}` when npm shows its passkey prompt, browser opens on user's machine, user authenticates. Replaces the need for OTP codes.

### Fixed

- **Smarter check scoping — no more all-checks blowup on investigative sessions** — `holdpoint check --staged` and the Copilot extension hook (`extension.mjs`) now use a three-tier file resolution: (1) staged files, (2) most recent commit files (`HEAD~1..HEAD`) if nothing is staged, (3) exit 0 (allow) if neither exists. This prevents burning tokens running every check on read-only / Q&A sessions, while correctly enforcing checks when an agent commits first and then calls `task_complete`.
- **Commit SHA cache** — after checks pass against a committed HEAD (no staged files), the SHA is recorded in `.holdpoint/checked-commits.json` (gitignored, capped at 100 entries). Subsequent `task_complete` calls on the same commit skip all checks immediately, ending the re-check loop. Both the CLI (`holdpoint check --staged`) and the Copilot extension (`extension.mjs`) share this cache.

### Added

- **Redesigned landing page** — hero section gains a dot-grid CSS background with radial signal glow, staggered `fade-up` entrance animations on the heading/subtext/CTA, and a pulsing dot in the alpha pill.
- **`AgentBanner` component** — continuous-scroll marquee with brand-coloured cards for GitHub Copilot, Claude Code, Cursor, and OpenAI Codex. Hover pauses the animation; duplicate track items carry `aria-hidden`. Respects `prefers-reduced-motion`. Replaces the old static "Works with" row.
- **`InstallCommand` agent selector** — tabs for All / Copilot / Claude / Cursor / Codex. "All" generates the `curl install.sh` command; specific agents generate `npx holdpoint@alpha init --agent <name>`. Active tab highlighted in signal colour.
- **CSS animation utilities in `globals.css`** — `@keyframes` and utility classes for `fade-up`, `float`, `scroll-left`, `pulse-signal`; marquee pause-on-hover; `@media (prefers-reduced-motion: reduce)` guard.
- **Holdpoint engine files for this repo** — `holdpoint init` now writes `.claude/settings.json`, `.codex/hooks.json`, `.codex/holdpoint-check.mjs`, `AGENTS.md`, and `.github/hooks/holdpoint.json` into the monorepo itself so the repo eats its own dogfood.

### Changed

- **Removed "Status" section from landing page** — replaced by a concise alpha disclaimer badge in the footer. The page previously showed a verbose bulleted list of what works and what doesn't.
- **Feature cards now show a hover glow** — `hover:shadow-signal/5` + icon background brightens on hover.
- **`--agent` CLI help text updated** — description now reads "copilot | claude | cursor | codex (default: all four)" to include Codex.

### Fixed

- **`checks.immutable.json` prompt fields restored** — the file had prompt fields stripped as a prior session workaround; regenerated via `holdpoint update`.
- **Auto-generated engine files excluded from Prettier** — `AGENTS.md`, `.claude/settings.json`, and `.codex/` added to `.prettierignore`. The "engine files in sync" check runs `holdpoint update` mid-check, which regenerates these files; Prettier was then flagging them as dirty and causing the "commit all changes" check to always fail.
- **`update.ts` writes `.claude/settings.json` with a trailing newline** — `writeFileSync` was missing the `+ "\n"` suffix, causing Prettier to flag the file after every `holdpoint update` run.
- **`engine-codex` generates Prettier-compatible `AGENTS.md`** — `buildAgentsMd()` now produces an unindented list (`- ` not ` -`) and includes a blank line after the start marker, matching the output Prettier would produce.
- **`engine-codex` check script uses trailing comma** — `buildCheckScript()` now generates `process.stderr.write(…,)` with a trailing comma, matching the repo's `trailingComma: "all"` Prettier config.

- **Copilot extension no longer blocks on prompt checks** — `extension.mjs` was returning `permissionDecision: deny` whenever any prompt check matched, including when all deterministic checks passed and there were no staged files. Prompt checks are advisory guidance that cannot be auto-verified; they are now surfaced as context alongside cmd failures but never block `task_complete` on their own.
- **Copilot CLI extension now uses the correct SDK API** — `extension.mjs` previously used a non-existent `export default { beforeTaskComplete() }` format that the local Copilot CLI never loaded. Rewrote to use `joinSession` from `@github/copilot-sdk/extension` (injected at runtime by the CLI) with `onPreToolUse` intercepting `task_complete`. Returns `{ permissionDecision: "deny", permissionDecisionReason }` to block.
- **Removed non-functional `preToolUse` hook from `holdpoint.json`** — the `.github/hooks/*.json` hook system does not fire for internal agent tools like `task_complete`. The `preToolUse` entry with `matcher: "task_complete"` was silently doing nothing. Removed to avoid confusion; `task_complete` interception is now solely handled by the SDK extension.

### Changed

- **`holdpoint init` now installs all agents by default** — Copilot, Claude Code, and Cursor engine files are written on every `init` (and `update`). Pass `--agent=copilot|claude|cursor` to restrict to one. Removes the flaky single-agent auto-detection that silently skipped engines when multiple agents were present.
- **`install.sh` no longer detects the agent** — agent detection removed from the one-liner installer. All three engine adapters are always installed; since each writes to its own hidden directory (`.github/hooks/`, `.claude/`, `.cursorrules`) they coexist without conflict.
- **`holdpoint update` regenerates all installed engines** — uses `detectInstalledAgents()` to find which engine files are present and regenerates all of them, instead of picking one via auto-detection.

### Added

- **OpenAI Codex engine adapter** — new `@holdpoint/engine-codex` package. Generates `.codex/hooks.json` (a `Stop` hook that exits `2` on failure so Codex keeps working until checks pass), `.codex/holdpoint-check.mjs` (Node script that runs `holdpoint check --staged` from the git root, converting non-zero exits to `2`), and an `AGENTS.md` instruction block. Exports: `buildHooksJson`, `buildCheckScript`, `buildAgentsMd`, `spliceAgentsMd`. 32 tests.
- **`"codex"` added to `AgentType`** — `packages/types/src/index.ts`.
- **Codex detection in `detect.ts`** — `detectInstalledAgents()` now detects Codex by presence of `.codex/holdpoint-check.mjs`. Deprecated `detectAgent()` also returns `"codex"` when `.codex/` exists.
- **`holdpoint init` and `holdpoint update` handle Codex** — write `.codex/hooks.json`, `.codex/holdpoint-check.mjs`, and splice `AGENTS.md`. Codex is now included in the default "all agents" install alongside Copilot, Claude, and Cursor.
- **Docs and README updated** — `README.md`, `apps/web/src/app/docs/page.tsx`, and the supported agents table all reflect the new Codex adapter including the trust-approval note.

- **`detectInstalledAgents(): AgentType[]`** in `packages/cli/src/detect.ts` — returns every agent whose Holdpoint engine files are already present in the project. Used by `update` to know what to regenerate.
- **Copilot CLI `extension.mjs` hook restored** — `holdpoint init`/`update` now writes `.github/extensions/holdpoint/extension.mjs` in addition to `.github/hooks/holdpoint.json`. The `extension.mjs` format is the mechanism the local Copilot CLI agent loads at startup to block `task_complete` when checks fail. The `.json` hooks format remains for cloud Copilot Coding Agent compatibility. Both coexist.
- **`buildEngine()` exported from `@holdpoint/engine-copilot`** — generates the `extension.mjs` source string (an ES module with `export default { async beforeTaskComplete() { … } }`).

## [0.1.0-alpha.2] — 2026-05-18

### Fixed

- **All `npx holdpoint` references → `npx @holdpoint/cli@alpha`** — `holdpoint` is not a registered npm package; the scoped `@holdpoint/cli` must be used. Fixed in `init.ts` post-install message, `check.ts` evolve hint, `evolve.ts` apply hint and internal `execSync`, and all template files (`MASTER_PROMPT.md`, `_base.yaml`, `typescript.yaml`, `python.yaml`, `nextjs.yaml`, `fullstack.yaml`, `go.yaml`).

## [0.1.0-alpha.1] — 2026-05-18

### Fixed

- **`workspace:*` deps in published packages** — switched publish command from `npm publish` to `pnpm publish`, which automatically converts `workspace:*` protocol to real version numbers at publish time. The broken `@holdpoint/cli@0.1.0-alpha.0` had `workspace:*` deps that npm could not resolve.
- **`install.sh` operator precedence** — stack detection used `[ ... ] || [ ... ] && VAR=true` which has wrong precedence; replaced with `if [ ... ] || [ ... ]; then VAR=true; fi` blocks.
- **`install.sh` removes "(monorepo only in alpha)"** — builder now ships inside the CLI package and works for any installed user.

### Added

- **Go stack detection in `install.sh`** — detects `go.mod` and sets `STACK="go"`.

### Changed

- **`install.sh` rewrite** — cleaner `printf`-based output (POSIX-portable vs `echo -e`), shorter color variable names, better aligned finish message, removed redundant env-var prefixes.
- **All 6 packages bumped to `0.1.0-alpha.1`**.

## [0.1.0-alpha.0] — 2026-05-18

### Added

- **Initial public alpha release** — all 6 packages (`@holdpoint/types`, `@holdpoint/yaml-core`, `@holdpoint/engine-copilot`, `@holdpoint/engine-claude`, `@holdpoint/engine-cursor`, `@holdpoint/cli`) published to npm under the `alpha` dist-tag (`0.1.0-alpha.0`).
- **`"tag": "alpha"` in `publishConfig`** for all publishable packages — prevents `npm install @holdpoint/cli` (no `@alpha`) from resolving, which is intentional for pre-1.0 software.
- **Repository, homepage, bugs, license, keywords** metadata added to all 6 `package.json` files for complete npm registry display.
- **`files: ["dist", "README.md", "LICENSE"]`** in all packages to ensure tarballs include docs alongside the build output.

### Changed

- **CLI program description** updated to `"Universal eval-guard for AI coding agents (alpha)"`.
- **`install.sh`** updated: `npx holdpoint@latest` → `npx @holdpoint/cli@alpha`; alpha notice added after banner; closing help text updated.
- **`README.md`**: alpha warning block at top; install commands updated to `@holdpoint/cli@alpha`; Cursor row in agent table changed to "advisory only (no block)"; `holdpoint build` row annotated "(monorepo-only, alpha)"; new **Status** section added between "How it works" and "Quick start".
- **Landing page** (`apps/web/src/app/page.tsx`): hero pill updated to "Early alpha — feedback welcome"; alpha badge added to nav wordmark; Cursor badge styled distinctly to signal non-enforcement; new **Status** section added between features grid and YAML code block; install command updated to use `@holdpoint/cli@alpha`.
- **`apps/web/src/app/layout.tsx`** metadata descriptions updated to include `(Alpha)`.

### Added

- **`InstallCommand` component** (`apps/web/src/components/InstallCommand.tsx`) — client component with copy-to-clipboard for the curl install command; icon swaps from `<Copy />` to `<Check />` for 1.5 s on successful copy.

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
