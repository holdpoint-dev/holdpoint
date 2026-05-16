# Sentinel — Eval Checkpoints

This is the Sentinel monorepo. It uses itself as a guinea pig — `checks.yaml`
enforces the same eval checkpoints on development here as it does on any user project.

## The Rule

Before marking **any** task complete:

1. Run `npx sentinel check` — all tasks must exit 0.
2. `sentinel check` also prints every **prompt** check whose `when` matches the
   files you changed. Carry out each listed instruction before finishing.

## Checks configuration

See `checks.yaml` at the project root for the full list of checks.

For the complete `checks.yaml` schema reference — trigger types, condition operators,
adding new checks, commands — see `templates/MASTER_PROMPT.md` (the guide
installed into every user project).

## Key rules for this codebase

- After editing `checks.yaml`, run `node packages/cli/dist/index.js update` to
  regenerate `.github/sentinel/generated/checks.immutable.json` and
  `.github/extensions/sentinel/extension.mjs`.
- After changing any `packages/*/src/` file, run `pnpm turbo build` to rebuild dist.
- After changing `packages/types/src/index.ts`, sync the Zod schema in
  `packages/yaml-core/src/schema.ts`.
- After adding or renaming templates in `templates/*.yaml`, sync
  `apps/builder/src/components/Toolbar.tsx` INLINE_TEMPLATES.
