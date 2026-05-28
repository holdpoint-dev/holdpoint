---
"@holdpoint/cli": patch
"holdpoint": patch
---

first-run polish: fix five rough edges in the empty-repo install experience

The default `holdpoint check` after a fresh `holdpoint init` had several
bugs that made the first impression rougher than it should be. All small
individual fixes:

- **`no-todos` no longer scans `node_modules/`** — the grep now excludes
  `node_modules`, `dist`, `.git`, `.next`, `.turbo`, `build`, `.venv`,
  `venv`, `__pycache__`, `target`, and `vendor`. Previously every project
  with any dep that had TODO comments (zod, react, almost everything)
  failed this check immediately. Updated in `templates/default.yaml`.

- **`node-typecheck` is now gated on `has-typecheck-script`** instead of
  just `is-node`. Projects with a `package.json` but no `typecheck` script
  used to get `Unknown command: "typecheck"` — now the check just
  evaluates the condition to false and skips cleanly. Mirrors the existing
  `has-lint-script` pattern for the lint check.

- **`holdpoint-suggest` no longer proposes `changelog-update` for
  changesets-using projects.** The suggest template's `trigger` now
  checks `!profile.hasChangesets`. Projects with `.changeset/config.json`
  get release notes from changesets automatically and don't want a
  manual-CHANGELOG-entry check that contradicts the sibling
  `changelog-changeset` check that IS in the default. Adds `hasChangesets`
  to the scanner's `ProjectProfile`.

- **Init's "Next steps" output uses `npx holdpoint check`** when the
  bare `holdpoint` binary isn't on PATH, and `holdpoint check` when it
  is. Previously the output always said `holdpoint check` which fails
  for users who only have the local devDep install. Detection via
  `command -v holdpoint`.

- **`holdpoint check` no longer fires every prompt-style check on a
  fresh repo with no changed files.** Old behavior used `["__all__"]`
  as a fallback for the `when:` filter when `changedFiles.length === 0`,
  which matched every scope and produced a 12-line wall of universal
  prompt advice. New behavior: suppress the prompt list in that mode and
  print a single dim informational line saying how many prompt checks
  are defined and that they fire relative to file changes. Prompts still
  surface normally as soon as there's an actual diff.

Also: documented the Zod UUID quirk that bit the daemon-replay test.
EventV1Schema's `id: z.string().uuid()` rejects strings whose variant
digit isn't `[89ab]` — common when using all-same-digit fixture UUIDs
like `11111111-1111-1111-1111-111111111111`. The fixture now uses
proper UUID v4 format (`11111111-1111-4111-8111-111111111111`).
