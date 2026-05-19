<!-- holdpoint:start -->

## Holdpoint Checks (auto-generated — do not edit this block)

Before marking ANY task complete, you MUST run all checks and confirm they pass:

```sh
node_modules/.bin/holdpoint check --staged
```

### Deterministic checks (automated)
- [always] **TypeScript — all packages**: `pnpm turbo typecheck`
- [always] **ESLint — all packages**: `pnpm turbo lint`
- [always] **Vitest — yaml-core + any added tests**: `pnpm turbo test`
- [always] **All YAML templates parse against Zod schema**: `node --input-type=module -e "import {parseHoldpointYaml} from './packages/yaml-core/dist/index.js';import {readFileSync,readdirSync} from 'node:fs';const f=readdirSync('templates').filter(f=>f.endsWith('.yaml'));for(const t of f){parseHoldpointYaml(readFileSync('templates/'+t,'utf8'));console.log('OK: '+t);}console.log('All '+f.length+' templates valid.');"`
- [always] **Prettier — format check**: `pnpm format:check`
- [checks-file] **Holdpoint engine files in sync with checks.yaml**: `node packages/cli/dist/index.js update`
- [builder-src] **Playwright — builder UI smoke tests**: `pnpm --filter @holdpoint/builder test:e2e`
- [structural] **Evolve checks when project structure changes**: `node packages/cli/dist/index.js evolve`
- [web-src] **Deploy web preview to Vercel**: `cd apps/web && npx vercel`
- [web-src] **Deploy web to Vercel production**: `cd apps/web && npx vercel --prod`
- [always] **Commit all changes before finishing**: `git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0; [ -z "$(git status --porcelain)" ] && exit 0; git status --short; exit 1`
- [always] **Production build passes**: `pnpm build`

### Prompt checks (manual verification required)
- [backend] **Rebuild dist/ after any source change**: After changing any package source file in packages/*/src/, run: pnpm turbo build The CLI and engines run from dist/, not src/ — stale builds silently run old code.

- [backend] **Keep when patterns in sync: yaml-core ↔ engine-copilot**: If you changed scope patterns in packages/yaml-core/src/trigger.ts, mirror the same file coverage in packages/engine-copilot/src/engine.ts (the matchesWhen() regex arrays inside the generated extension.mjs string).

- [backend] **Update Zod schema when TypeScript types change**: If you changed interfaces in packages/types/src/index.ts, update the Zod schema in packages/yaml-core/src/schema.ts to match, then rebuild: pnpm turbo build.

- [templates-src] **Sync Toolbar.tsx INLINE_TEMPLATES with templates/*.yaml**: If you changed any file in templates/*.yaml, update the matching entry in apps/builder/src/components/Toolbar.tsx INLINE_TEMPLATES — same IDs, labels, commands, manual text, and conditions.

- [backend] **Update README when CLI commands change**: If you added, removed, or changed a command in packages/cli/src/commands/, update the Commands section in README.md with the new usage and description.

- [always] **Add a CHANGELOG.md entry for this session**: Before committing, add an entry to CHANGELOG.md describing what was done. Use Keep a Changelog format — add under ## [Unreleased] (create the file and that section if absent). Group entries as Added, Changed, Fixed, or Removed. Be concise but specific. The entry text will serve as the commit message.

- [always] **Update README.md if user-facing changes were made**: If you added, changed, or removed user-facing functionality — CLI commands, configuration options, public APIs, or significant new features — update README.md to reflect those changes.

- [lib-src] **Keep /docs page in sync with schema/CLI changes**: If you changed the checks.yaml schema, CLI commands, supported agents, or when: scope patterns in packages/yaml-core/src/trigger.ts, update apps/web/src/app/docs/page.tsx to reflect those changes.

- [always] **No TODO/FIXME left in changed code**: Scan the files you changed for any TODO, FIXME, HACK, or XXX comments. Either resolve them before finishing or convert them to GitHub issues. Don't leave incomplete work silently behind.
- [always] **JSDoc on changed public functions**: Ensure all changed public functions, classes, and module exports have accurate JSDoc comments (description + @param + @returns where applicable).

If `holdpoint check` exits non-zero, fix all failures before finishing.
For prompt checks, explicitly confirm in your response that you have acted on each item.
<!-- holdpoint:end -->
