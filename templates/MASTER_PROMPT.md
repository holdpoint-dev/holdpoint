# Sentinel — Eval Checkpoints

This project uses [Sentinel](https://github.com/HarzerHeribert/sentinel) to enforce
eval checkpoints. Before marking any task done, all checks must pass.

---

## The Rule

Before marking **any** task complete:

1. Run `npx sentinel check` — all tasks must exit 0.
2. `sentinel check` also prints every **prompt** check whose `when` matches the
   files you changed. Read and act on each listed instruction before finishing.

---

## checks.yaml — Full Reference

`checks.yaml` at the project root is the single source of truth. Edit it to add,
remove, or change checkpoints.

After every edit, regenerate the engine files and commit everything together:

```
npx sentinel update
git add checks.yaml .github/sentinel/generated/ .github/extensions/
git commit -m "chore: update sentinel checks"
```

### Top-level structure

```yaml
version: 1

context:
  guides: # project notes shown when `sentinel check` runs
    setup: >
      Use pnpm, not npm. Node 20+ required.

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

| Value       | Fires when changed files match                                                        |
| ----------- | ------------------------------------------------------------------------------------- |
| _(absent)_  | Every task — no file filter applied                                                   |
| `frontend`  | `**/*.tsx`, `**/*.jsx`, `**/*.css`, `**/*.scss`, `**/tailwind.config.*`, `apps/**`    |
| `backend`   | `**/api/**`, `**/server/**`, `**/routes/**`, `**/controllers/**`, `packages/*/src/**` |
| `prisma`    | `**/prisma/**`, `**/*.prisma`                                                         |
| `socket`    | `**/socket/**`, `**/ws/**`, `**/websocket/**`                                         |
| `visual`    | `**/*.stories.{ts,tsx}`, `**/__screenshots__/**`, `**/*.snap`                         |
| `"^src/.*"` | Any JavaScript regex tested against each changed file path                            |

Regex example — fires only when files under `src/api/` change:

```yaml
when: "^src/api/" # new RegExp(when).test(filePath)
```

> **Note:** `when` is a JavaScript regex, not a glob. Use `^` to anchor to
> the start of the repo-relative file path.

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
at the start of `sentinel check` output as project-level reminders to whoever
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
3. Run `npx sentinel update`.
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

---

## Commands

| Command                       | What it does                                           |
| ----------------------------- | ------------------------------------------------------ |
| `npx sentinel check`          | Run checks against all files changed vs HEAD           |
| `npx sentinel check --staged` | Run checks against staged files only                   |
| `npx sentinel update`         | Regenerate engine files from the current `checks.yaml` |
| `npx sentinel validate`       | Validate `checks.yaml` schema (no commands run)        |
| `npx sentinel build`          | Open the visual builder UI at localhost:4321           |

---

## Generated files (do not edit directly)

| File                                               | Agent   |
| -------------------------------------------------- | ------- |
| `.github/sentinel/generated/checks.immutable.json` | all     |
| `.github/extensions/eval-guard/extension.mjs`      | Copilot |
| `.claude/settings.json`                            | Claude  |
| `.cursorrules` (Sentinel section)                  | Cursor  |

All generated files are overwritten by `npx sentinel update`. Edit `checks.yaml`,
then run `update` — never edit the generated files directly.
