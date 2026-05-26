#!/usr/bin/env bash
# tag-release.sh — Create + push a v<version> git tag from the current
# packages/cli version.
#
# This is invoked by `.github/workflows/version.yaml` as the `publish` step
# of `changesets/action` AFTER a Version Packages PR is merged. We do NOT
# publish to npm here — that's handled by `.github/workflows/publish.yaml`,
# which fires on `v*` tag push. This script's only job is to push the tag
# that lights that workflow up.
#
# The split-workflow setup is deliberate: it keeps the OIDC `--provenance`
# publish + dist-tag sync logic isolated in publish.yaml so we don't have
# to migrate it into the changesets/action publish step.
#
# Idempotent: if the tag already exists (e.g. someone re-ran the workflow),
# we exit 0 without trying to push again.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION=$(node -p "require('./packages/cli/package.json').version")
TAG="v${VERSION}"

if git rev-parse --verify "refs/tags/${TAG}" >/dev/null 2>&1; then
  echo "Tag ${TAG} already exists locally — skipping."
  exit 0
fi

# Also check the remote in case the tag was pushed from elsewhere.
if git ls-remote --exit-code --tags origin "${TAG}" >/dev/null 2>&1; then
  echo "Tag ${TAG} already exists on origin — skipping."
  exit 0
fi

echo "Creating release tag ${TAG}"
git tag -a "${TAG}" -m "Release ${VERSION}"
git push origin "${TAG}"
echo "Pushed ${TAG} — publish.yaml will now fire on the tag-push trigger."
