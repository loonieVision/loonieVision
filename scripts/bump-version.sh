#!/bin/bash
set -e

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.0.0"
  exit 1
fi

VERSION=$1

# Validate semver format (simplified validation for X.Y.Z)
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Error: Invalid version format. Expected X.Y.Z (e.g., 1.0.0)"
  exit 1
fi

# Create release branch
BRANCH_NAME="release/v$VERSION"
git checkout -b "$BRANCH_NAME" 2>/dev/null || { echo "Branch already exists or checkout failed"; exit 1; }

# Update package.json version
sed -i.bak 's/"version": "[^"]*/"version": "'"$VERSION"'"/' package.json
rm package.json.bak

# Update Cargo.toml version
sed -i.bak 's/^version = "[^"]*"/version = "'"$VERSION"'"/' src-tauri/Cargo.toml
rm src-tauri/Cargo.toml.bak

# Update tauri.conf.json version and identifier
# Update version
sed -i.bak 's/"version": "[^"]*",/"version": "'"$VERSION"'",/' src-tauri/tauri.conf.json
# Update identifier
sed -i.bak 's/"identifier": "com\.loonievision\.example"/"identifier": "com.loonievision.app"/' src-tauri/tauri.conf.json
rm src-tauri/tauri.conf.json.bak

# Commit changes
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore(release): bump version to v$VERSION"

# Create PR
gh pr create --base main --head "$BRANCH_NAME" --title "release: v$VERSION" --body ""

echo "PR created: release/v$VERSION"
echo "After reviewing and merging, create and push the tag:"
echo "  git checkout main && git pull"
echo "  git tag -a v$VERSION -m \"Release v$VERSION\""
echo "  git push origin v$VERSION"