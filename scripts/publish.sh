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

# ── Sync dist-tags ────────────────────────────────────────────────────────────
# Convention while we're pre-1.0: BOTH `latest` and `alpha` point at the newest
# alpha version. They only diverge when we cut a beta or stable — at that point
# this block needs revisiting (alpha tag should freeze on the last alpha, latest
# moves to the new track).
#
# Why this is needed: `pnpm changeset publish` honours each package's
# `publishConfig.tag: "alpha"` AND also moves `latest` for new versions, so we
# end up with `latest` ahead of `alpha` by one. `npm publish --tag alpha` (used
# in CI) has the opposite problem — moves alpha but never `latest`. Both paths
# need an explicit sync step.
echo ""
echo "==> Syncing dist-tags so latest and alpha both point at the new version…"
sync_tags() {
  local dir="$1"
  local name version
  name=$(node -p "require('./${dir}/package.json').name")
  version=$(node -p "require('./${dir}/package.json').version")
  # `add` is idempotent — running it when the tag already points at this
  # version is a no-op, so we can be aggressive without breaking anything.
  if npm dist-tag add "${name}@${version}" alpha 2>/dev/null; then
    echo "  ✓ ${name}@${version} → alpha"
  fi
  if npm dist-tag add "${name}@${version}" latest 2>/dev/null; then
    echo "  ✓ ${name}@${version} → latest"
  fi
}
for pkg in types yaml-core engine-copilot engine-claude engine-cursor engine-codex live-protocol sdk live-daemon cli; do
  sync_tags "packages/$pkg"
done
sync_tags "packages/holdpoint"
