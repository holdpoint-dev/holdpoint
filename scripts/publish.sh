#!/usr/bin/env bash
# publish.sh — Build and publish all public @holdpoint/* packages via Changesets.
#
# ── FOR AI AGENTS ─────────────────────────────────────────────────────────────
# npm publish requires browser-based 2FA (passkey). Run this script in ASYNC
# bash mode so you can interact with the process:
#
#   1. Start:  bash scripts/publish.sh  (mode="async", initial_wait=30)
#   2. Watch output. When you see a line containing "Press ENTER" (npm's passkey
#      prompt), send {enter} via write_bash.
#   3. Notify the user: "Browser opened for passkey auth — please authenticate."
#   4. Wait for the command to finish (allow up to 5 minutes).
#   5. Read final output to confirm all packages published successfully.
#
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Building all packages…"
pnpm turbo build

echo ""
echo "==> Checking for pending changesets…"
if ! ls .changeset/*.md 2>/dev/null | grep -qv README; then
  echo "No changesets found. Run: pnpm changeset"
  echo "Or publish without bumping versions: pnpm changeset publish --no-git-tag"
fi

echo ""
echo "==> Publishing to npm (browser 2FA will be required)…"
echo "    [AI agent: send {enter} when you see the 'Press ENTER' passkey prompt]"
echo ""

pnpm changeset publish

# Single-track release: every package's publishConfig defaults to `latest`,
# so `changeset publish` puts each new version on latest with no extra work.
# The historical `alpha` dist-tag (last set to 0.1.0-alpha.16) is left in
# place as a breadcrumb for anyone who pinned to it; remove it manually with
# `npm dist-tag rm @holdpoint/<pkg> alpha` if you want a clean registry view.
