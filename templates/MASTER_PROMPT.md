# Holdpoint — Eval Checkpoints

This repo uses [Holdpoint](https://holdpoint.dev) to enforce eval
checkpoints. Before marking any task done, all checks must pass.

## The Rule

Before marking **any** task complete:

1. Run `holdpoint check` — all checks must exit 0.
2. `holdpoint check` also prints every **prompt** check whose `when`
   matches the files you changed. Read and act on each listed
   instruction before finishing.
3. Never bypass via `git commit --no-verify` or by skipping a stop
   hook. If a check is wrong, fix the check in `checks.yaml`, don't
   route around it.

## The Suggest Loop

`checks.yaml` grows with the project. `holdpoint-suggest` is a check
that fires whenever structural files change (`package.json`,
`pyproject.toml`, `go.mod`, `Dockerfile`, `tsconfig.json`,
`vitest.config.*`, etc.). When it fires, `holdpoint suggest` runs and
**exits 1 if `checks.yaml` is out of sync** — blocking task completion
until you apply the proposals.

When blocked, run:

    holdpoint suggest --apply

then commit the changes and continue.

## Going deeper

For the full reference — every built-in check, every `when:` scope,
per-engine details, troubleshooting — read
[`HOLDPOINT_REFERENCE.md`](./HOLDPOINT_REFERENCE.md). The file is on
disk; you can `cat` it when you need detail. It is intentionally not
auto-injected because it's reference, not directive.
