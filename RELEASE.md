# LoonieVision Release Guide

This guide explains how to create releases for LoonieVision using the automated GitHub Actions workflow.

## Overview

Release workflow is automatically triggered when you push a version tag (e.g., `v1.0.0`) to the repository. The workflow will:

1. Validate that the tag version matches `package.json`
2. Build the app for all platforms (macOS, Linux, Windows)
3. Code sign the binaries
4. Create a GitHub release with all artifacts
5. Upload `latest.json` for the auto-updater

### Prerequisites

Before you can create a release, ensure the following are in place:

- [ ] All 8 GitHub secrets are configured (see below)
- [ ] You have maintainer permissions to push tags
- [ ] The version bump PR has been merged

---

## Required GitHub Secrets

Navigate to **Settings > Secrets and variables > Actions** and add these secrets:

| Secret                               | Description                                                            |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `APPLE_CERTIFICATE`                  | Base64-encoded macOS signing certificate (.p12 file)                   |
| `APPLE_CERTIFICATE_PASSWORD`         | Password for the macOS certificate                                     |
| `APPLE_SIGNING_IDENTITY`             | Signing identity name (e.g., `Developer ID Application: Your Name`)    |
| `APPLE_ID`                           | Your Apple ID email                                                    |
| `APPLE_PASSWORD`                     | App-specific password for notarization (generate at appleid.apple.com) |
| `APPLE_TEAM_ID`                      | Your Apple Developer Team ID (10-character string)                     |
| `TAURI_SIGNING_PRIVATE_KEY`          | Private key for Tauri updater signatures                               |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the signing key (if encrypted)                            |

#### macOS Signing Setup

To generate the required macOS credentials:

1. **Export your signing certificate** from Keychain Access as a `.p12 file
2. **Base64 encode the certificate**:
   ```bash
   base64 -i certificate.p12 | pbcopy
   ```
3. Paste the result as `APPLE_CERTIFICATE`

4. **Get your signing identity**: Run this in Terminal:
   ```bash
   security find-identity -v -p codesigning
   ```
5. Copy the full identity name as `APPLE_SIGNING_IDENTITY`

6. **Generate an app-specific password** at [appleid.apple.com](https://appleid.apple.com) for notarization

#### Tauri Updater Key Setup

If you don't have a Tauri signing key, generate one:

```bash
cargo install cargo-generate-rpm
tauri signer generate
```

The private key goes in `TAURI_SIGNING_PRIVATE_KEY`. Update the public key in `src-tauri/tauri.conf.json` if you generate a new one.

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

## GitHub Tag Protection (Recommended)

Configure GitHub rules to prevent unauthorized tag pushes:

1. Go to **Settings > Branches**
2. Create a branch protection rule for `main` (recommended) or use tag protection
3. Enable:
   - [ ] **Restrict who can push tags** - Only allow maintainers
   - [ ] **Require status checks to pass before merging**
   - [ ] **Require pull request reviews**

---

## Troubleshooting

### Tag Version Mismatch

**Error**: `Tag version (1.0.0) does not match package.json version (0.1.0)`

**Solution**: Ensure the version bump PR has been merged before creating the tag.

### Signing Fails

**Error**: Code signing errors during macOS/Windows build

**Solutions**:

1. Verify all 8 secrets are configured correctly
2. Test with **Actions > Build Test** to validate credentials
3. Ensure your Apple Developer certificates are valid
4. Check that `APPLE_TEAM_ID` is exactly 10 characters

### Updater Not Working

**Error**: The app doesn't detect new releases

**Solutions**:

1. Verify `latest.json` exists at `https://github.com/lobeVision/lobeVision/releases/latest/download/latest.json`
2. Check that the release is published (not a draft)
3. Ensure the public key in `tauri.conf.json` matches the private key used for signing
4. Test the updater by setting `TAURI_UPDATER_ENDPOINT` to a local URL in development

macOS Notarization Failures

**Error**: Notarization failed

**Solutions**:

1. Verify `APPLE_ID` and `APPLE_PASSWORD` are correct
2. Ensure your Apple Developer account is in good standing
3. Check that `APPLE_TEAM_ID` matches your enrollment

### Build Timeout

**Error**: Workflow times out after 6 hours

**Solution**: The GitHub Actions timeout is 6 hours per job. If builds are slow:

1. Ensure all jobs have fast-fast: `false` (already configured)
2. Consider reducing platforms if not all are needed for immediate release
3. Check for dependency installation issues in the Rust toolchain

---

## Access Control

The release workflow can only complete for tags pushed by repository maintainers. Configure GitHub tag protection rules to prevent unauthorized tag creation.

**Recommended Settings**:

- **Branch protection rule for `main`**:
  - Restrict who can push matching tags
  - Require status checks to pass
  - Require pull request reviews

- **Tag protection rules** (in GitHub repo settings):
  - Limit tag pushes to maintainers only

---

## Post-Release Checklist

After each release, ensure:

- [ ] Release notes are added
- [ ] `latest.json` is properly formatted and accessible
- [ ] Test the update by running the previous version
- [ ] Update CHANGELOG.md if you maintain one
- [ ] Announce release to users (if applicable)
