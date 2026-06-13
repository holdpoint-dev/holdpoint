---
"@holdpoint/types": patch
"@holdpoint/yaml-core": patch
"@holdpoint/cli": patch
"@holdpoint/engine-claude": patch
"@holdpoint/engine-codex": patch
"@holdpoint/engine-copilot": patch
"@holdpoint/engine-cursor": patch
---

fix: harden the session-start security scan and de-duplicate it into one shared source

The scan logic now lives in a single source of truth, `@holdpoint/types`
(`buildSecurityScanScript()` + `SECURITY_SCAN_PACKAGES`), which all four engines
import instead of each carrying a hand-synced copy. Correctness and security fixes:

- **MCP "verified" is no longer forgeable.** Trust is bound to the package that
  actually executes (derived from `command` + `args` — npx/bunx/pnpm dlx/yarn dlx
  targets, `node` script paths, or the command binary), never the human-set `name`
  or unrelated args. A server can no longer mark itself verified by name.
- **Non-npm servers (e.g. `uvx`) get a calm "source not checkable" group** instead
  of a scary false "unverified" warning; versioned npx targets (`pkg@latest`) now
  match the registry.
- **`audit` criticals are no longer dropped** — findings are sorted by severity
  before the 5-item cap.
- **Yarn Berry** uses `yarn npm audit` (detected via `.yarnrc.yml` /
  `packageManager`) instead of the nonexistent `yarn audit --json`.
- **A timed-out audit surfaces a diagnostic** instead of looking identical to a
  clean repo.
- **npm v7 transitive `via` arrays** no longer put a parent package name in the
  advisory title.
- The dependency audit no longer runs on Claude `resume`/`compact` re-fires or on
  Codex `SubagentStart`, and a new `security_scan: false` config flag opts out
  entirely. Claude's session-start context hook is gated by `seedsSession`.
- The auto-scan banner is appended **after** user `session_context_files`, so
  context-overflow truncation drops the scan, not the user's configured files.
- Removed the dead CLI `runScan`/`lib/scan` entry, its tsup entry, and the
  redundant `verified-mcp-registry.json` data copy; reconciled `init.ts` drift
  against `templates/default.yaml`.
