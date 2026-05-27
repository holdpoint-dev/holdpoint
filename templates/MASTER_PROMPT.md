# Holdpoint — Eval Checkpoints

This project uses [Holdpoint](https://github.com/holdpoint-dev/holdpoint) to enforce
eval checkpoints. Before marking any task done, all checks must pass.

---

## The Rule

Before marking **any** task complete:

1. Run `holdpoint check` — all tasks must exit 0.
2. `holdpoint check` also prints every **prompt** check whose `when` matches the
   files you changed. Read and act on each listed instruction before finishing.

---

## The Suggest Loop

`checks.yaml` is not static — it grows alongside the project automatically.

**`holdpoint-suggest` is a deterministic check** in `checks.yaml` that fires whenever you change a structural file (`package.json`, `pyproject.toml`, `go.mod`, `Dockerfile`, `tsconfig.json`, `vitest.config.*`, etc.). When it fires, `holdpoint suggest` runs and **exits 1 if `checks.yaml` is out of sync** — blocking task completion until you apply the proposals.

When blocked by `holdpoint-suggest`, run:

```
holdpoint suggest --apply  # scan, apply proposals, regenerate engine files
```

Then commit:

```
git add checks.yaml .github/holdpoint/generated/
git commit -m "chore: suggest holdpoint checks"
```

`holdpoint suggest --apply` is idempotent — safe to re-run at any time. It only adds checks for tools/patterns detected in the project and wraps stale checks (whose `when:` pattern no longer matches any file) with `conditionId: file_exists` so they auto-skip instead of failing.

**What triggers evolution:**

- New dependency in `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml`
- New `Dockerfile`, `docker-compose.yml`, `*.tf`, `openapi.yaml`
- New test runner config (`vitest.config.*`, `jest.config.*`, `playwright.config.*`)
- New CI workflow in `.github/workflows/`
- New TypeScript setup (`tsconfig.json`)

**What does NOT trigger it:** `.ts` / `.py` / `.go` source files, docs, styles, tests — minor work proceeds without interruption.

---

## Git workflow best practices

Prefer the least-disruptive git workflow that still satisfies the task:

- Use a branch + PR when the user requests it, when work targets protected
  `main`, or when remote CI/review is part of the task.
- For small local fixes, commit directly on the current branch and do not open a
  PR unless the user asks.
- If already on a feature branch, keep committing there instead of creating
  another branch.
- After committing, decide whether to push: push when a PR, remote review, CI
  run, or handoff needs it; otherwise leave the commit local and report the
  branch/commit.

---

## checks.yaml — Full Reference

`checks.yaml` at the project root is the single source of truth. Edit it to add,
remove, or change checkpoints.

After every edit, regenerate the engine files and commit everything together:

```
holdpoint update
git add checks.yaml .github/holdpoint/generated/ .github/hooks/
git commit -m "chore: update holdpoint checks"
```

### Top-level structure

```yaml
version: 1

context:
  guides: # project notes shown when `holdpoint check` runs
    setup: >
      Use pnpm, not npm. Node 20+ required.

session_context_files:
  - MASTER_PROMPT.md # injected into Copilot/Codex sessions when supported

conditions: # gate checks on file/env state
  - id: dist-built
    operator: file_exists
    path: dist/index.js

checks: # list of all checks — each has on/when + cmd (task) or prompt
  - ...
```

---

### Deterministic check

```yaml
- id: lint # unique slug, kebab-case
  label: "ESLint — all packages" # human-readable label shown in output
  # on: before_done       # lifecycle hook (default; only value today)
  # when: frontend        # file filter — omit to run on every task
  cmd: "pnpm turbo lint" # shell command; must exit 0 to pass
  conditionId: dist-built # optional: skip if condition is not met
```

### Prompt check

```yaml
- id: migration-review
  label: "Review DB migration"
  when: "^prisma/migrations/" # only fires when migration files change
  prompt: >
    Open the new migration file. Confirm it is backward-compatible
    and does not drop or truncate data without a fallback.
```

---

### `on` — lifecycle hooks

`on` specifies _when in the agent lifecycle_ a check fires. Omit it to use the default.

| Value         | Fires                              |
| ------------- | ---------------------------------- |
| `before_done` | Before the agent marks a task done |

---

### `when` — file filters

`when` is an optional file filter. If omitted the check runs on every task.

| Value       | Fires when changed files match                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------- |
| _(absent)_  | Every task — no file filter applied                                                                |
| `frontend`  | `**/*.tsx`, `**/*.jsx`, `**/*.css`, `**/*.scss`, `**/tailwind.config.*`, `apps/**`                 |
| `backend`   | `**/api/**`, `**/server/**`, `**/routes/**`, `**/controllers/**`, `packages/*/src/**`              |
| `socket`    | `**/socket/**`, `**/ws/**`, `**/websocket/**`                                                      |
| `visual`    | `**/*.stories.{ts,tsx}`, `**/__screenshots__/**`, `**/*.snap`                                      |
| `python`    | `**/*.py`, `**/*.pyi`, `**/requirements*.txt`, `**/pyproject.toml`, `**/setup.py`, `**/pytest.ini` |
| `go`        | `**/*.go`, `**/go.mod`, `**/go.sum`                                                                |
| `rust`      | `**/*.rs`, `**/Cargo.toml`, `**/Cargo.lock`                                                        |
| `java`      | `**/*.java`, `**/*.kt`, `**/*.gradle`, `**/*.gradle.kts`, `**/pom.xml`                             |
| `ruby`      | `**/*.rb`, `**/Gemfile`, `**/Gemfile.lock`, `**/Rakefile`                                          |
| `database`  | `**/*.sql`, `**/migrations/**`, `**/db/**`, `**/database/**`, `**/prisma/**`, `**/*.prisma`        |
| `prisma`    | `**/prisma/**`, `**/*.prisma` — focused subset of `database` for Prisma-specific checks            |
| `testing`   | `**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`, `**/test/**`, `**/tests/**`, `**/spec/**`         |
| `infra`     | `**/Dockerfile*`, `**/docker-compose.*`, `**/*.tf`, `**/*.tfvars`, `**/k8s/**`, `**/kubernetes/**` |
| `ci`        | `**/.github/workflows/**`, `**/.circleci/**`, `**/Jenkinsfile`, `**/.gitlab-ci.yml`                |
| `docs`      | `**/*.mdx`, `**/*.rst`, `**/docs/**`, `**/documentation/**`                                        |
| `"^src/.*"` | Any JavaScript regex tested against each changed file path                                         |

Regex example — fires only when files under `src/api/` change:

```yaml
when: "^src/api/" # new RegExp(when).test(filePath)
```

> **Note:** Named scopes use glob matching; plain strings are treated as JavaScript regexes.

---

### Conditions

Conditions let you skip a check when a prerequisite is not yet met (e.g. a build
artefact doesn't exist yet).

| Operator          | What it checks                                    |
| ----------------- | ------------------------------------------------- |
| `file_exists`     | A file or directory exists at `path`              |
| `file_contains`   | The file at `path` contains the substring `value` |
| `env_var_set`     | The environment variable named `value` is set     |
| `shell_returns_0` | The shell command in `cmd` exits with code 0      |

```yaml
conditions:
  - id: packages-built
    operator: file_exists
    path: packages/yaml-core/dist/index.js

checks:
  - id: validate-templates
    label: "Templates parse against schema"
    conditionId: packages-built # skipped (◌) when dist is absent
    cmd: "node dist/validate.js templates/"
```

---

### Context guides

`context.guides` is a freeform key → multiline-string map. Guides are printed
at the start of `holdpoint check` output as project-level reminders to whoever
(or whatever) is running the checks.

```yaml
context:
  guides:
    setup: >
      This project requires Node 20 and pnpm 9+.
      Run `pnpm install` from the repo root before any other command.
    architecture: >
      API routes live in src/api/. Models live in src/models/.
      Client code must never import from server modules.
```

---

## Adding a New Check

1. Open `checks.yaml`.
2. Add your entry under `checks:`.
3. Run `holdpoint update`.
4. Commit `checks.yaml` and the generated files.

**Add a task check (runs a shell command automatically):**

```yaml
checks:
  - id: vitest
    label: "Vitest — unit tests"
    cmd: "pnpm vitest run"
```

**Add a scoped task (fires only on matching file changes):**

```yaml
checks:
  - id: openapi-sync
    label: "OpenAPI types are up to date"
    when: "^src/api/"
    cmd: "pnpm generate:types && git diff --exit-code src/generated/"
```

**Add an agent prompt checkpoint:**

```yaml
checks:
  - id: jsdoc
    label: "JSDoc on changed public functions"
    prompt: >
      For every public function or export you modified, ensure there is an
      accurate JSDoc comment: description, @param, and @returns.
```

**Enforce changelog and git commit on every task (recommended):**

```yaml
checks:
  - id: changelog-update
    label: "Add a CHANGELOG.md entry for this session"
    prompt: >
      Before committing, add an entry to CHANGELOG.md describing what was done.
      Use Keep a Changelog format — add under ## [Unreleased] (create the file
      and that section if absent). Group entries as Added, Changed, Fixed, or Removed.
      Be concise but specific. The entry text will serve as the commit message.

  - id: readme-sync
    label: "Update README.md if user-facing changes were made"
    prompt: >
      If you added, changed, or removed user-facing functionality — CLI commands,
      configuration options, public APIs, or significant new features — update
      README.md to reflect those changes.

  - id: git-workflow
    label: "Use the right git workflow"
    prompt: >
      Choose the least-disruptive git workflow: use branch + PR for requested
      feature branches or protected-main work; for small local fixes, commit on
      the current branch without opening a PR unless asked; if already on a
      feature branch, keep committing there instead of creating another branch.
      Push only when a PR, remote review, CI run, or handoff needs it; otherwise
      leave the commit local and report the branch/commit.

  - id: git-commit
    label: "Commit all changes before finishing"
    cmd: 'git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0; [ -z "$(git status --porcelain)" ] && exit 0; git status --short; exit 1'
```

When the `git-commit` check fails (uncommitted changes remain), the agent will also see
the `changelog-update` and `readme-sync` prompt reminders inline — ensuring it updates
the changelog, syncs docs, _then_ commits before it can mark the task done.

---

## `session_context_files`

`session_context_files` is an optional list of project files that Holdpoint injects
as context at the start of every Copilot session. Use it for files the agent should
always read before starting work.

```yaml
session_context_files:
  - MASTER_PROMPT.md
  - AGENT_CONTEXT.md
```

Files are resolved relative to the repo root and must stay inside it (traversal
paths like `../../etc/passwd` are rejected). If a file doesn't exist it is silently
skipped.

---

## Commands

| Command                       | What it does                                            |
| ----------------------------- | ------------------------------------------------------- |
| `holdpoint check`             | Run checks against all files changed vs HEAD            |
| `holdpoint check --staged`    | Run checks against staged files only                    |
| `holdpoint suggest`           | Scan project and show proposed additions to checks.yaml |
| `holdpoint suggest --apply`   | Apply proposals and regenerate engine files             |
| `holdpoint require-changeset` | Require `.changeset/*.md` for package changes           |
| `holdpoint update`            | Regenerate engine files from the current `checks.yaml`  |
| `holdpoint validate`          | Validate `checks.yaml` schema (no commands run)         |
| `holdpoint builder`           | Open the daemon-served visual builder UI                |

---

## Generated files (do not edit directly)

| File                                                | Agent   |
| --------------------------------------------------- | ------- |
| `.github/holdpoint/generated/checks.immutable.json` | all     |
| `.github/hooks/holdpoint.json`                      | Copilot |
| `.github/hooks/holdpoint-check.mjs`                 | Copilot |
| `.claude/settings.json`                             | Claude  |
| `.cursorrules` (Holdpoint section)                  | Cursor  |

All generated files are overwritten by `holdpoint update`. Edit `checks.yaml`,
then run `update` — never edit the generated files directly.
