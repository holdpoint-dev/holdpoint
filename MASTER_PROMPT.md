# Holdpoint — Eval Checkpoints

This is the Holdpoint monorepo. It uses itself as a guinea pig — `checks.yaml`
enforces the same eval checkpoints on development here as it does on any user project.

## The Rule

Before marking **any** task complete:

1. Run `npx holdpoint check` — all tasks must exit 0.
2. `holdpoint check` also prints every **prompt** check whose `when` matches the
   files you changed. Carry out each listed instruction before finishing.

## Checks configuration

See `checks.yaml` at the project root for the full list of checks.

For the complete `checks.yaml` schema reference — trigger types, condition operators,
adding new checks, commands — see `templates/MASTER_PROMPT.md` (the guide
installed into every user project).

## Key rules for this codebase

- After editing `checks.yaml`, run `node packages/cli/dist/index.js update` to
  regenerate `.github/holdpoint/generated/checks.immutable.json` and
  `.github/extensions/holdpoint/extension.mjs`.
- After changing any `packages/*/src/` file, run `pnpm turbo build` to rebuild dist.
- After changing `packages/types/src/index.ts`, sync the Zod schema in
  `packages/yaml-core/src/schema.ts`.
- After adding or renaming templates in `templates/*.yaml`, sync
  `apps/builder/src/components/Toolbar.tsx` INLINE_TEMPLATES.

## Publishing packages to npm

Publishing requires browser-based 2FA (passkey). The flow must be run in **async
bash mode** so you can send the Enter keypress that opens the browser.

```
Step-by-step for AI agents:
  1. Run `make publish` using mode="async", initial_wait=30
  2. Monitor output with read_bash. When you see "Press ENTER" (npm's passkey
     prompt), immediately send {enter} via write_bash.
  3. Notify the user: "Browser opened for npm passkey auth — please authenticate."
  4. Wait up to 5 minutes for the publish to complete (read_bash with delay=300).
  5. Confirm all packages show "Published" in the output.
```

The `auth-type=web` setting in `.npmrc` ensures npm always uses browser auth
instead of prompting for a TOTP code.
