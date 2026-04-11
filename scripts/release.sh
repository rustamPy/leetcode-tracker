#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh <version>  (e.g. 1.1.0)"
  exit 1
fi

PKG="menubar-app/package.json"

# Validate semver format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be in format X.Y.Z (e.g. 1.1.0)"
  exit 1
fi

# Enforce releases from main only
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: releases must be cut from the main branch."
  echo "  Currently on: ${CURRENT_BRANCH}"
  echo "  Merge your changes into main first, then re-run this script."
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes detected. Commit or stash them first."
  exit 1
fi

echo "Releasing v${VERSION}..."

# Bump version in package.json
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('${PKG}'));
  p.version = '${VERSION}';
  fs.writeFileSync('${PKG}', JSON.stringify(p, null, 2) + '\n');
"

git add "$PKG"
git commit -m "chore: release v${VERSION}"
git push origin main

git tag "v${VERSION}"
git push origin "v${VERSION}"

echo ""
echo "✓ Tag v${VERSION} pushed — GitHub Actions is now building the release."
echo "  Watch progress: https://github.com/rustamPy/leetcode-tracker/actions"
echo ""
echo "  If TAP_GITHUB_TOKEN is set, the Homebrew cask will update automatically."
echo "  If not, run after the build completes:"
echo "    curl -L -o /tmp/lt.dmg https://github.com/rustamPy/leetcode-tracker/releases/download/v${VERSION}/LeetCode.Tracker-${VERSION}-arm64.dmg"
echo "    shasum -a 256 /tmp/lt.dmg"
