<!-- holdpoint:start -->

## Holdpoint Checks (auto-generated — do not edit this block)

Before marking ANY task complete, you MUST run all checks and confirm they pass:

```sh
node_modules/.bin/holdpoint check --staged
```

### Deterministic checks (automated)
- [always] **TypeScript — all packages**: `pnpm turbo typecheck`
- [always] **ESLint — all packages**: `pnpm turbo lint`
- [always] **Vitest — all packages**: `pnpm turbo test`
- [always] **All YAML templates parse against Zod schema**: `node --input-type=module -e "import {parseHoldpointYaml} from './packages/yaml-core/dist/index.js';import {readFileSync,readdirSync} from 'node:fs';const f=readdirSync('templates').filter(f=>f.endsWith('.yaml'));for(const t of f){parseHoldpointYaml(readFileSync('templates/'+t,'utf8'));console.log('OK: '+t);}console.log('All '+f.length+' templates valid.');"`
- [always] **Prettier — format check**: `pnpm format:check`
- [checks-file] **Holdpoint engine files in sync with checks.yaml**: `node packages/cli/dist/index.js update`
- [builder-src] **Playwright — builder UI smoke tests**: `pnpm --filter @holdpoint/builder test:e2e`
- [always] **Changeset for package changes**: `node packages/cli/dist/index.js require-changeset --staged --include packages/*`
- [always] **Commit all changes before finishing**: `git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0; [ -n "${GIT_INDEX_FILE:-}" ] && exit 0; [ -z "$(git status --porcelain)" ] && exit 0; git status --short; exit 1`
- [always] **No TODO/FIXME left in changed code**: `! grep -rEn "TODO|FIXME|HACK|XXX" packages/*/src apps/*/src --include="*.ts" --include="*.tsx"`
- [backend] **Production build passes**: `pnpm build`

### Prompt checks (manual verification required)
- [backend] **Rebuild dist/ after any source change**: After changing any package source file in packages/*/src/, run: pnpm turbo build The CLI and engines run from dist/, not src/ — stale builds silently run old code.

- [backend] **Update Zod schema when TypeScript types change**: If you changed interfaces in packages/types/src/index.ts, update the Zod schema in packages/yaml-core/src/schema.ts to match, then rebuild: pnpm turbo build.

- [templates-src] **Keep builder default template loader in sync**: If you changed templates/default.yaml, confirm apps/builder/src/components/Toolbar.tsx still loads that file as the builder's default template.

- [backend] **Update README when CLI commands change**: If you added, removed, or changed a command in packages/cli/src/commands/, update the Commands section in README.md with the new usage and description.

- [lib-src] **Keep /docs page in sync with schema/CLI changes**: If you changed the checks.yaml schema, CLI commands, supported agents, or when: scope patterns in packages/yaml-core/src/trigger.ts, update apps/web/src/app/docs/page.tsx to reflect those changes.

- [always] **Keep HOLDPOINT_LIVE_SPEC.md progress tracker current**: On every commit, if this task touched any Holdpoint Live implementation, update HOLDPOINT_LIVE_SPEC.md before finishing. Keep the phase status table, granular todo checklists, and deferred-item notes accurate for what is now implemented vs still pending.

If `holdpoint check` exits non-zero, fix all failures before finishing.
For prompt checks, explicitly confirm in your response that you have acted on each item.
<!-- holdpoint:end -->
