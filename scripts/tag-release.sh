#!/usr/bin/env bash
# tag-release.sh — Create + push a v<version> git tag from the current
# packages/cli version.
#
# This is invoked by `.github/workflows/version.yaml` as the `publish` step
# of `changesets/action` AFTER a Version Packages PR is merged. We do NOT
# publish to npm here — that's handled by `.github/workflows/publish.yaml`.
# This script pushes the tag, then explicitly dispatches that workflow for the
# tag ref. The explicit dispatch is required because tag pushes made with
# GITHUB_TOKEN do not start another workflow run.
#
# The split-workflow setup is deliberate: it keeps the OIDC `--provenance`
# publish + dist-tag sync logic isolated in publish.yaml so we don't have
# to migrate it into the changesets/action publish step.
#
# Idempotent: if the tag already exists (e.g. someone re-ran the workflow), we
# skip the push and still dispatch publish.yaml. The publish workflow itself is
# idempotent for already-published packages.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION=$(node -p "require('./packages/cli/package.json').version")
TAG="v${VERSION}"

if git ls-remote --exit-code --tags origin "${TAG}" >/dev/null 2>&1; then
  echo "Tag ${TAG} already exists on origin — skipping tag push."
else
  if ! git rev-parse --verify "refs/tags/${TAG}" >/dev/null 2>&1; then
    echo "Creating release tag ${TAG}"
    git tag -a "${TAG}" -m "Release ${VERSION}"
  else
    echo "Tag ${TAG} already exists locally — pushing it to origin."
  fi
  git push origin "${TAG}"
  echo "Pushed ${TAG}."
fi

if command -v gh >/dev/null 2>&1 && { [ -n "${GH_TOKEN:-}" ] || [ -n "${GITHUB_TOKEN:-}" ]; }; then
  echo "Dispatching publish.yaml for ${TAG}"
  gh workflow run publish.yaml --ref "${TAG}"
  echo "Dispatched publish.yaml for ${TAG}."
else
  echo "gh is unavailable or unauthenticated; dispatch publish.yaml manually for ${TAG}."
fi
