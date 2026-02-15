# LoonieVision Release Guide

This guide explains how to create releases for LoonieVision using the automated GitHub Actions workflow.

## Overview

Release workflow is automatically triggered when you push a version tag (e.g., `v1.0.0`) to the repository. The workflow will:

1. Validate that the tag version matches `package.json`
2. Build the app for all platforms (macOS, Linux, Windows)
3. Create a GitHub release with all artifacts
4. Upload `latest.json` for the auto-updater

---

## Release Process

### Step 1: Create and Merge the Version Bump PR

Use the version bump script to create a PR:

```bash
./scripts/bump-version.sh 1.0.0
```

This will:

- Create a PR on branch `release/v1.0.0`
- Update `package.json`, `Cargo.toml`, and `tauri.conf.json`

Review the PR and merge it to `main`. The CI pipeline will run all tests.

### Step 2: Create and Push the Version Tag

After the PR is merged:

```bash
git checkout main
git pull
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Step 3: Monitor the Release Workflow

The release workflow will automatically start. You can monitor it at:

`Actions > Release` in GitHub

The workflow builds for all 4 platforms:

- macOS Apple Silicon (`aarch64-apple-darwin`)
- macOS Intel (`x86_64-apple-darwin`)
- Linux
- Windows

### Step 4: Add Release Notes

Once the workflow completes, go to the GitHub release page and add release notes:

1. Navigate to the `v1.0.0` release
2. Click "Edit release"
3. Add release notes in the description
4. Save

The updater uses `latest.json` to check for updates, which is automatically generated and uploaded by the workflow.

---

## Dry-Run Builds

Before creating a release, you can test builds without creating a release:

1. Go to **Actions > Build Test**
2. Click "Run workflow"
3. Choose a platform or "all"
4. Click "Run workflow"

This validates that:

- The build succeeds for all platforms
- Code signing credentials work correctly
- No unexpected build errors occur

Build artifacts are stored for 7 days and can be downloaded for inspection.

---

## Post-Release Checklist

After each release, ensure:

- [ ] Release notes are added
- [ ] `latest.json` is properly formatted and accessible
- [ ] Test the update by running the previous version
