# Holdpoint — Agent Context

> **For AI coding agents:** This file is your starting point. It describes the project's current state, what was already fixed, and what still needs work. Read it before making changes.

Generated: 2026-05-15  
Last updated: 2026-05-15 (implemented changes from initial audit)

---

## TL;DR

The Holdpoint monorepo is structurally sound and further along than a typical scaffold: all six packages exist, all dist/ directories are pre-built, the CLI responds correctly to `--help`, and five YAML templates validate cleanly against the schema. The P0 publish blocker and core logic bugs have been fixed (see below). The remaining priorities are adding tests, hosting the visual builder, and improving multi-agent detection.

---

## What Has Been Fixed (2026-05-15)

The following issues from the original audit have been resolved:

- **P0-1** — All six packages are now publishable: removed `"private": true`, added `"publishConfig": { "access": "public" }` to `packages/types`, `yaml-core`, `engine-copilot`, `engine-claude`, `engine-cursor`, `cli`. Changed `.changeset/config.json` access to `"public"`. `apps/builder` and `apps/web` remain private.
- **P0-2** — `holdpoint build` now displays a clear, actionable error message when run outside the Holdpoint monorepo, instead of a generic "Builder app not found."
- **P0-3** — `__all__` trigger bug fixed: `matchesTrigger` in `yaml-core/trigger.ts` now returns `true` when `changedFiles` contains `"__all__"`, so all checks run when no staged files exist.
- **P1-6** — Manual checks now use `matchesTrigger` with the actual changed files, not just `trigger.type === "always"`. Non-`always` manual checks correctly surface when their trigger matches.
- **P1-1** — Trigger matching in `engine-copilot/src/engine.ts` updated to use the same file categories as `yaml-core/trigger.ts` (was using incomplete regex patterns; now covers `controllers`, `middleware`, `websocket`, `tailwind.config`, etc.). Also added `__all__` / empty-files guard.
- **P1-2** — Dead `@holdpoint/yaml-core` dependency removed from `engine-copilot/package.json`.
- **P1-3** — `engine-claude/src/engine.ts` now has a comment explaining why `_config` is intentionally unused and the runtime-delegation design tradeoff.
- **P2-1** — `sourcemap: true` added to `engine-claude` and `engine-cursor` `tsup.config.ts`.
- **P2-2** — Toolbar inline templates (`apps/builder/src/components/Toolbar.tsx`) are now fully aligned with the on-disk `templates/*.yaml` files. All four stacks now match labels, IDs, manual checks, and conditions.
- **P1-4** — `graphToConfig` in `apps/builder/src/store/canvas.ts` now respects edge connections (trigger is read from the connected trigger node via edges) and exports condition nodes.
- **P2-4** — Cursor rules block splice in `update.ts` no longer uses a hardcoded `end + 40` offset; it finds the next newline after the end marker for a robust slice.

---

## Repo Structure (actual vs planned)

| Path                               | Planned | Present           |
| ---------------------------------- | ------- | ----------------- |
| `apps/builder/`                    | yes     | yes               |
| `apps/web/`                        | yes     | yes               |
| `packages/types/`                  | yes     | yes               |
| `packages/yaml-core/`              | yes     | yes               |
| `packages/engine-copilot/`         | yes     | yes               |
| `packages/engine-claude/`          | yes     | yes               |
| `packages/engine-cursor/`          | yes     | yes               |
| `packages/cli/`                    | yes     | yes               |
| `templates/`                       | yes     | yes — 5 files     |
| `install.sh`                       | yes     | yes               |
| `.github/workflows/ci.yml`         | yes     | yes               |
| `.github/workflows/publish.yml`    | yes     | yes               |
| `.github/workflows/release.yml`    | yes     | yes               |
| `.changeset/config.json`           | yes     | yes               |
| `turbo.json`                       | yes     | yes               |
| `pnpm-workspace.yaml`              | yes     | yes               |
| `.github/CONTRIBUTING.md`          | implied | yes               |
| `.github/ISSUE_TEMPLATE/`          | implied | yes (3 templates) |
| `.github/PULL_REQUEST_TEMPLATE.md` | implied | yes               |

**Nothing planned is missing at the structural level.** Every directory and config file exists. The gaps are in implementation quality and publish readiness, detailed below.

---

## Package Status Table

| Package                   | Status              | Notes                                                                                                                       |
| ------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `packages/types`          | EXISTS and COMPLETE | All types exported; dist built; no tests (acceptable for types-only)                                                        |
| `packages/yaml-core`      | EXISTS and COMPLETE | Parser, runner, schema, trigger matching all implemented; 8 tests; dist built                                               |
| `packages/engine-copilot` | EXISTS and PARTIAL  | Full hook implementation but trigger matching diverges from yaml-core; no tests; yaml-core listed as dep but never imported |
| `packages/engine-claude`  | EXISTS and PARTIAL  | Functional but ignores config entirely (`_config` unused); no source map; no tests                                          |
| `packages/engine-cursor`  | EXISTS and PARTIAL  | Generates natural-language rules only; no enforcement; no source map; no tests                                              |
| `packages/cli`            | EXISTS and PARTIAL  | All 5 commands scaffolded with real logic; `build` command broken for end users; `__all__` magic string bug; no tests       |
| `apps/builder`            | EXISTS and PARTIAL  | React Flow wired, all 4 node types present, Export YAML works — but graphToConfig ignores edges; conditions never exported  |
| `apps/web`                | EXISTS and EMPTY    | Static Next.js landing page only; no functional features                                                                    |
| `templates/`              | EXISTS and COMPLETE | All 5 templates valid; minor divergence from Toolbar inline templates                                                       |

---

## What Works Right Now

### packages/types

All types import cleanly. `dist/index.js` and `dist/index.d.ts` are present and correct. Exports: `TriggerType`, `Trigger`, `ConditionOperator`, `ConditionDef`, `CheckDef`, `HoldpointConfig`, `HoldpointContext`, `CheckStatus`, `CheckResult`, `ValidationError`, `ValidationResult`, `AgentType`, `StackType`, `NodeKind`, `CanvasNodeData`.

### packages/yaml-core

Core exports are present and functional: `parseHoldpointYaml`, `validateConfig`, `generateYaml`, `matchesTrigger`, `runDeterministicChecks`, plus all Zod schemas. 8 tests covering parse, validate, generate, and trigger matching. Dist built with source map.

### packages/engine-copilot

`buildEngine(config)` produces a self-contained `extension.mjs` that embeds config as JSON, implements git staged-file detection, runs deterministic checks with a 60s timeout, and returns `{ decision: "block" }` on failure. The `beforeTaskComplete` hook is fully implemented.

### packages/engine-claude

`buildEngine(_config)` and `buildEngineJson(config)` both work and produce valid `.claude/settings.json` with `PostToolUse` and `Stop` hooks. Output is identical for all configs (by design, but undocumented).

### packages/engine-cursor

`buildEngine(config)` produces a human-readable `.cursorrules` instruction block listing all deterministic and manual checks.

### packages/cli

All five commands are implemented with real logic, ora spinners, chalk output, and proper error handling. `detect.ts` correctly identifies agent type and stack. The CLI binary works:

```
Usage: holdpoint [options] [command]

Universal eval-guard for AI coding agents

Options:
  -V, --version    output the version number
  -h, --help       display help for command

Commands:
  init [options]   Initialise Holdpoint in the current project
  check [options]  Run deterministic checks from checks.yaml
  validate         Validate checks.yaml schema and print any errors
  update           Regenerate engine files from current checks.yaml
  build            Open the visual builder UI on localhost:4321
  help [command]   display help for command
```

### apps/builder

- React Flow (`@xyflow/react ^12.3.6`) is installed and wired
- Four node types implemented: `TriggerNode`, `DeterministicCheckNode`, `ManualCheckNode`, `ConditionNode`
- `exportYaml()` calls `generateYaml()` from yaml-core — round-trip works for simple graphs
- `loadFromYaml(text)` parses YAML and reconstructs graph
- `loadTemplate()` loads 5 stack templates
- `SidePanel` live-edits node properties
- `Toolbar` has Export YAML and Copy YAML buttons

### templates/

All 5 templates are syntactically valid YAML and conform to the HoldpointConfig Zod schema:

- `_base.yaml` — 2 deterministic, 1 manual
- `typescript.yaml` — 2 deterministic, 2 manual
- `python.yaml` — 3 deterministic, 2 manual
- `nextjs.yaml` — 4 deterministic, 4 manual, 1 condition
- `fullstack.yaml` — 5 deterministic, 5 manual, 2 conditions

### install.sh

Validates git repo, Node ≥18; detects agent and stack correctly; delegates to `npx holdpoint@latest init`. The script itself is production-quality bash — the blocker is that the npm package does not exist yet.

### CI/CD

- `ci.yml`: correct — pnpm@9, Node 20, frozen-lockfile install, turbo build + typecheck + lint + test
- `release.yml`: correct — builds and attaches `install.sh` to GitHub Release on `v*` tags
- `publish.yml`: present but broken (see P0 below)

---

## What Is Broken (P0)

These block any real usage.

### P0-1 — All packages are `"private": true` — npm publish impossible

Every `package.json` has `"private": true`. The entire user-facing workflow (`install.sh → npx holdpoint@latest init`) depends on the CLI being published to npm. This is the single hardest blocker.

**Fix required in:**

- `packages/cli/package.json` — remove `"private": true`, add `"publishConfig": { "access": "public" }`
- `packages/yaml-core/package.json` — same
- `packages/engine-copilot/package.json` — same
- `packages/engine-claude/package.json` — same
- `packages/engine-cursor/package.json` — same
- `packages/types/package.json` — same
- `.changeset/config.json` — change `"access": "restricted"` to `"access": "public"`

`apps/builder` and `apps/web` should remain private.

### P0-2 — `holdpoint build` is broken for any installed user

The `build` command runs `pnpm --filter @holdpoint/builder dev`. This requires the Holdpoint monorepo to exist in the user's working directory. Any user who ran `npx holdpoint init` will not have `apps/builder/` in their project. The command fails with "Builder app not found."

There is no standalone build of the builder app. Either the builder must be hosted (and `holdpoint build` opens a URL), or the builder must be bundled separately and distributed, or the command must be removed from the CLI.

### P0-3 — `__all__` magic string does not run non-`always` checks

In `packages/cli/src/commands/check.ts`, when no git-staged files are found, the code passes `["__all__"]` to `runDeterministicChecks`. Inside `yaml-core/runner.ts`, this calls `matchesTrigger(check.trigger, ["__all__"])`. For checks with `trigger.type !== "always"`, the glob matching against the literal string `"__all__"` returns false — those checks are silently skipped.

**Intended behaviour:** run all checks when no files are staged.  
**Actual behaviour:** only `trigger: { type: always }` checks run.

**Fix:** In `runner.ts`, detect `changedFiles.includes("__all__")` and return `true` from `matchesTrigger` unconditionally, OR pass an empty array and add a `skipTriggerFilter` flag.

---

## What Is Missing (P1)

Meaningful gaps that affect core functionality but have partial workarounds.

### P1-1 — Trigger matching divergence: engine-copilot vs yaml-core

The generated `extension.mjs` reimplements trigger matching with inline regex patterns (e.g., `/\.tsx?$/`, `/\/api\//`). `yaml-core/trigger.ts` uses minimatch globs (e.g., `**/*.{ts,tsx}`, `**/api/**`). Results are usually identical but diverge in edge cases. This creates a silent inconsistency: `holdpoint check` and the Copilot extension may disagree on which checks apply to a given file.

**Fix:** In `engine-copilot/src/engine.ts`, import yaml-core's `matchesTrigger` and inline its source into the generated `extension.mjs` string (since the output must be self-contained), OR rewrite the generated trigger matching to use the same minimatch patterns.

### P1-2 — engine-copilot declares yaml-core as a dependency but never imports it

`packages/engine-copilot/package.json` lists `@holdpoint/yaml-core: workspace:*` as a dependency. The source (`engine.ts`) only imports from `@holdpoint/types`. The dependency is dead weight and misleading. Either remove it or actually use it (related to P1-1).

### P1-3 — engine-claude ignores the config entirely

`buildEngine(_config: HoldpointConfig)` uses `_config` (the underscore prefix signals intentional non-use). The generated `.claude/settings.json` is identical for every project. While the design of delegating to the CLI at runtime is defensible, it means the generated artifact provides no transparency into what will run.

No documentation or comment explains this design decision. A developer reading the generated settings.json has no way to see what checks are configured.

### P1-4 — Builder's graphToConfig ignores edges

`apps/builder/src/store/canvas.ts: graphToConfig()` accepts a `nodes` and `edges` parameter but uses only `nodes`. Edge connections between trigger nodes and check nodes have no effect on YAML export. Conditions in `config.conditions` are always exported as an empty array, even if condition nodes are on the canvas.

This means the visual canvas is purely decorative for export purposes. A user carefully wiring up a graph will get the same YAML as if they hadn't.

### P1-5 — No tests for CLI, engines, or builder

Only `packages/yaml-core` has tests (8 tests, all passing in a correct environment). CLI commands, engine outputs, detect logic, canvas store logic, and the round-trip `init → check` flow have zero test coverage. Any regression will be invisible until a user reports it.

### P1-6 — Manual checks not surfaced for non-`always` triggers

In `check.ts`, `manualChecks` are filtered the same way as deterministic checks. Only `trigger.type === "always"` manual checks are ever shown. If a user has a `trigger: { type: frontend }` manual check (e.g., "confirm accessibility for UI changes"), it is never displayed — even when frontend files change. This is a logic bug, not a design choice.

---

## What Is Missing (P2)

Nice-to-have; not blocking current functionality.

### P2-1 — engine-claude and engine-cursor missing source maps

`tsup.config.ts` for both packages lacks `sourcemap: true`. The other four packages include source maps. Minor inconsistency; no runtime impact.

### P2-2 — Inline templates in Toolbar.tsx diverge from on-disk templates

The `typescript` inline template in `apps/builder/src/components/Toolbar.tsx` includes a `test` deterministic check (`pnpm test --run`). The `templates/typescript.yaml` file on disk does not. Users who use the builder get a different typescript template than users who run `holdpoint init --stack typescript`.

### P2-3 — detect.ts may misclassify multi-agent projects

If a project has both `.github/extensions` (Copilot) and `.claude` (Claude Code), `detect.ts` will always return `"copilot"` because it checks Copilot first. The `holdpoint update` command then regenerates only copilot files, leaving claude hooks stale.

### P2-4 — holdpoint update cursor uses a brittle string offset

`commands/update.ts` for cursor engine computes `end + 40` as a hardcoded offset into `.cursorrules` to find where to splice the holdpoint block. If the holdpoint block end-marker changes, this breaks silently.

### P2-5 — No end-to-end integration tests

No test exercises the full `holdpoint init → write files → holdpoint check → exit code` flow. This is the most important user path and has no automated coverage.

### P2-6 — apps/web is a static stub

`apps/web` is a placeholder Next.js page with no functional content. Not blocking but should be noted as unimplemented.

### P2-7 — No vitest configuration files

Tests rely on vitest defaults (no explicit `vitest.config.ts`). Works but could cause surprise if defaults change.

---

## Build Output

All `dist/` directories exist and were pre-built (last modified 2026-05-14). No rebuild was possible in the audit environment due to a native Rollup module mismatch (`@rollup/rollup-linux-arm64-gnu` not found — node_modules were installed on macOS, not the audit Linux environment).

| Package                   | `dist/index.js` | `dist/index.d.ts` | `dist/index.js.map` |
| ------------------------- | --------------- | ----------------- | ------------------- |
| `packages/types`          | ✅              | ✅                | ✅                  |
| `packages/yaml-core`      | ✅              | ✅                | ✅                  |
| `packages/engine-copilot` | ✅              | ✅                | ✅                  |
| `packages/engine-claude`  | ✅              | ✅                | ❌ missing          |
| `packages/engine-cursor`  | ✅              | ✅                | ❌ missing          |
| `packages/cli`            | ✅              | ✅                | ✅                  |

**Expected build errors to watch for:** If `pnpm install` is re-run on a fresh Linux machine, the Rollup native module must be reinstalled (`pnpm install --force` or platform-specific). This is an environment issue, not a code bug.

---

## Test Output

Tests could not be run in the audit environment (same Rollup/native module mismatch). Based on source inspection:

- `packages/yaml-core/src/__tests__/core.test.ts` — 8 tests; all appear correct based on source review. Covers: valid parse, invalid YAML throw, schema violation throw, valid config, generateYaml round-trip, matchesTrigger (always, frontend, prisma, regex).
- All other packages — 0 tests.

**Expected test run result on correct environment:** yaml-core: 8 pass. All others: no tests collected.

---

## Recommended Next Steps (Ordered)

These are ordered by what unblocks the next thing.

**1. Make packages publishable (unblocks everything)**  
Remove `"private": true` from all six packages, add `"publishConfig": { "access": "public" }` to each, change changeset access to `"public"`. Without this, no end user can ever install Holdpoint.

**2. Fix the `__all__` trigger bug in check.ts and runner.ts (P0-3)**  
Add a guard in `matchesTrigger` (or in the runner) so that `["__all__"]` bypasses trigger filtering entirely. Write a test for it. This is the most impactful single logic bug — it silently skips checks.

**3. Fix manual check surfacing in check.ts (P1-6)**  
Manual checks should be filtered by `matchesTrigger` using the actual changed files, not just `type === "always"`. This is a parallel fix to the deterministic check logic.

**4. Decide on `holdpoint build` fate and fix it (P0-2)**  
Options: (a) host the builder at a URL and have `holdpoint build` open it in a browser, (b) bundle the builder as a standalone web app and publish it to npm alongside the CLI, (c) remove `holdpoint build` from the CLI until a hosting solution exists. Option (a) is fastest.

**5. Unify trigger matching between engine-copilot and yaml-core (P1-1)**  
The generated `extension.mjs` should use the same minimatch-based logic as `yaml-core/trigger.ts`. Since the output must be self-contained, inline the trigger logic as a literal string in `engine.ts` rather than reimplementing it with regex.

**6. Remove dead yaml-core dependency from engine-copilot (P1-2)**  
After step 5 (which will actually use yaml-core) or explicitly drop it.

**7. Add tests for the CLI's core paths (P1-5)**  
Minimum: `holdpoint init` with each agent type writes the expected files, `holdpoint check` with a known-failing command exits non-zero, `holdpoint validate` on a bad yaml outputs errors.

**8. Fix builder's graphToConfig to respect edges (P1-4)**  
Edges define which checks belong to which trigger. The export should read edge connections to assign checks to trigger nodes, and condition nodes should be reflected in the exported conditions array.

**9. Align inline templates in Toolbar.tsx with on-disk templates (P2-2)**  
The typescript template discrepancy is a user-visible inconsistency.

**10. Add source maps to engine-claude and engine-cursor (P2-1)**  
One-line fix in each `tsup.config.ts`. Do this in the same PR as other tsup changes.

**11. Document engine-claude's runtime-delegation design (P1-3)**  
Add a comment in `engine-claude/src/engine.ts` explaining why `_config` is unused, what the tradeoff is (always-identical output vs. simplicity), and whether this is intentional long-term.

**12. Address multi-agent detect.ts ordering (P2-3)**  
Either detect all agents and generate files for all of them, or at minimum warn the user when multiple agents are detected.
