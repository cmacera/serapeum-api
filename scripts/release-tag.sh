#!/usr/bin/env bash
# Phase B of the manual release flow.
# Tags the merged release commit on main and pushes the tag, which triggers .github/workflows/release.yml.
# Run this after the release prep PR (from scripts/release.sh) has been merged.
#
# Usage: bash scripts/release-tag.sh

set -euo pipefail

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Must run from main (currently on $CURRENT_BRANCH). Run: git checkout main" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working directory is not clean. Commit or stash changes first." >&2
  exit 1
fi

echo "Pulling latest main..."
git pull --ff-only origin main

VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"

HEAD_SUBJECT="$(git log -1 --pretty=%s)"
NORMALIZED_SUBJECT="$(echo "$HEAD_SUBJECT" | sed -E 's/ \(#[0-9]+\)$//')"
EXPECTED="chore(release): bump version to $TAG"
if [[ "$NORMALIZED_SUBJECT" != "$EXPECTED" ]]; then
  echo "HEAD commit subject does not match the expected release commit." >&2
  echo "  expected: $EXPECTED" >&2
  echo "  got:      $NORMALIZED_SUBJECT" >&2
  echo "Did you merge the release prep PR? Or did another commit land after?" >&2
  exit 1
fi

if [[ -n "$(git tag --list "$TAG")" ]]; then
  echo "Tag $TAG already exists locally. Aborting." >&2
  exit 1
fi

if git ls-remote --tags origin "refs/tags/$TAG" | grep -q .; then
  echo "Tag $TAG already exists on origin. Aborting." >&2
  exit 1
fi

echo "Creating tag $TAG..."
git tag "$TAG"

echo "Pushing tag $TAG..."
git push origin "$TAG"

REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@github\.com:|https://github\.com/)([^/]+/[^/.]+)(\.git)?#\2#')"

cat <<EOF

Tag $TAG pushed.
The Release & Deploy workflow should now be running:
  https://github.com/$REPO_SLUG/actions/workflows/release.yml
GitHub Release will appear at:
  https://github.com/$REPO_SLUG/releases/tag/$TAG
EOF
