# Contributing to Holdpoint

Thank you for your interest in contributing! Holdpoint is built in public with a strong
emphasis on determinism, correctness, and simplicity.

## Local setup

```bash
git clone https://github.com/holdpoint-dev/holdpoint.git
cd holdpoint
pnpm install
pnpm build
```

## Project structure

```
holdpoint/
├── apps/
│   ├── builder/    ← React + Vite canvas (the visual YAML builder)
│   └── web/        ← Next.js landing page
├── packages/
│   ├── cli/        ← `holdpoint` CLI entry-point
│   ├── engine-copilot/
│   ├── engine-claude/
│   ├── engine-cursor/
│   ├── yaml-core/  ← shared parser, validator, runner (all engines depend on this)
│   └── types/      ← shared TypeScript types
└── templates/      ← starter checks.yaml per stack
```

## Adding a new engine

1. Create `packages/engine-<name>/`
2. Add `package.json`, `tsconfig.json`, `tsup.config.ts`
3. Export `buildEngine(config: HoldpointConfig): string` from `src/index.ts`
4. Add detection logic in `packages/cli/src/detect.ts`
5. Wire it into `packages/cli/src/commands/init.ts` and `update.ts`
6. Open a PR with the `new-engine` label

## Adding a new template

1. Create `templates/<stack>.yaml`
2. Follow the structure of existing templates
3. Keep it minimal — only universally applicable checks
4. Reference it from `packages/cli/src/commands/init.ts`

## Commit style

Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`

## Releasing

Holdpoint uses [Changesets](https://github.com/changesets/changesets):

```bash
pnpm changeset       # add a changeset
pnpm version-packages # bump versions
# then push and create a tag — CI handles the rest
```

## Code of conduct

Be kind. Focus on technical merit. Holdpoint is a deterministic tool —
keep the codebase that way too.
