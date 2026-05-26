---
"@holdpoint/cli": patch
"holdpoint": patch
---

ci/dx: self-enforcement parity with the tool's own guarantees

CI now runs `pnpm format:check` and `holdpoint check` so every PR
passes the same gates Holdpoint enforces on AI agents. Pre-commit
hook (husky) runs `holdpoint check --staged` on every human commit.
Dependabot is enabled for weekly npm + GitHub Actions updates. Node
version is pinned via .nvmrc (24) across all workflows. The
`no-todos` check is now a hard cmd instead of an agent-only prompt.
