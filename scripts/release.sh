#!/usr/bin/env bash
# Phase A of the manual release flow.
# Bumps package.json version and opens a PR. After the PR is merged, run scripts/release-tag.sh.
#
# Usage: bash scripts/release.sh [patch|minor|major]   (default: patch)

set -euo pipefail

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Invalid bump type: $BUMP. Expected one of: patch, minor, major." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Missing dependency: GitHub CLI (gh). Install from https://cli.github.com." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working directory is not clean. Commit or stash changes first." >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Must run from main (currently on $CURRENT_BRANCH). Run: git checkout main" >&2
  exit 1
fi

echo "Pulling latest main..."
git pull --ff-only origin main

echo "Bumping version ($BUMP)..."
npm version "$BUMP" --no-git-tag-version >/dev/null

VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"
BRANCH="release/$TAG"

if git rev-parse --verify --quiet "$BRANCH" >/dev/null; then
  echo "Branch $BRANCH already exists locally. Delete it first: git branch -D $BRANCH" >&2
  git checkout -- package.json package-lock.json
  exit 1
fi

echo "Creating release branch $BRANCH..."
git checkout -b "$BRANCH"
git add package.json package-lock.json
git commit -m "chore(release): bump version to $TAG"

echo "Pushing branch..."
git push -u origin "$BRANCH"

echo "Opening PR..."
gh pr create \
  --base main \
  --head "$BRANCH" \
  --title "chore(release): bump version to $TAG" \
  --body "Release **$TAG**.

Merging this PR is the human checkpoint that approves the release.
After merge, run \`npm run release:tag\` from \`main\` to tag the squash-merge commit and trigger the deploy workflow."

cat <<EOF

Release prep PR opened for $TAG.
Next steps:
  1. Review and merge the PR (squash merge).
  2. From main: git checkout main && git pull --ff-only
  3. Run: npm run release:tag
EOF
