# Holdpoint prerequisites

Holdpoint installed repo-local adapters for one or more AI coding agents. Before relying on them locally, review these setup notes:

- **GitHub Copilot CLI** — Holdpoint's `.github/extensions/holdpoint/extension.mjs` uses the Copilot CLI **EXTENSIONS** feature. Today that feature is gated behind experimental mode. In Copilot CLI, run `/experimental on` so **EXTENSIONS** appears in the enabled feature set before using Holdpoint locally.
- **Cursor** — project-level hooks run in trusted workspaces. After opening the repo in Cursor, confirm the workspace is trusted and review Settings → Hooks if hooks do not fire.
- **OpenAI Codex** — project-level hooks require trust approval. Run `codex trust` in the Codex TUI or review the hook with `/hooks`.
- **General** — Holdpoint expects Node.js 18+ and a git repository so `holdpoint init`, `holdpoint update`, and `holdpoint check` can run normally.

Docs: https://holdpoint.dev/docs
