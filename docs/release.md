# Release Checklist

This document covers the release workflow for desktop releases.

## What the workflow does

- Workflow: `.github/workflows/release.yml`
- Triggers:
  - push tag matching `v*.*.*`
  - manual `workflow_dispatch` with an explicit `version` input
- Runs quality gates first: lint, typecheck, test.
- Builds three desktop artifacts in parallel:
  - macOS `arm64` DMG
  - macOS `x64` DMG
  - Linux `x64` AppImage
- Publishes one GitHub Release with all produced files.
  - Tags with a suffix after `X.Y.Z` (for example `1.2.3-alpha.1`) are published as GitHub prereleases.
  - Plain `X.Y.Z` releases are marked as the repository's latest release.
  - Automatically generated release notes are pinned to the previous release tag.
- Includes Electron auto-update metadata (for example `latest*.yml` and `*.blockmap`) in release assets.
- The CLI publish job is currently disabled in the workflow; when re-enabled, it publishes the CLI package (`packages/server`, npm package `usemulti`) with npm tag `latest`.
- Signing is optional and auto-detected per platform from secrets.

## Desktop auto-update notes

- Runtime updater: `electron-updater` in `packages/desktop/src/main.ts`.
- Update UX:
  - Background checks run on startup delay + interval.
  - No automatic download or install.
  - The desktop UI shows a rocket update button when an update is available; click once to download, click again after download to restart/install.
- Provider: GitHub Releases (`provider: github`) configured at build time.
- Repository slug source:
  - `MULTI_DESKTOP_UPDATE_REPOSITORY` (format `owner/repo`), if set.
  - otherwise `GITHUB_REPOSITORY` from GitHub Actions.
- Temporary private-repo auth workaround:
  - set `MULTI_DESKTOP_UPDATE_GITHUB_TOKEN` (or `GH_TOKEN`) in the desktop app runtime environment.
  - the app forwards it as an `Authorization: Bearer <token>` request header for updater HTTP calls.
- Required release assets for updater:
  - platform installers (`.dmg`, `.AppImage`, plus macOS `.zip` for Squirrel.Mac update payloads)
  - channel metadata: `latest*.yml`
  - `*.blockmap` files (used for differential downloads)
- macOS metadata note:
  - `electron-updater` reads `latest-mac.yml` for both Intel and Apple Silicon.
  - The workflow merges the per-arch mac manifests into one mac manifest before publishing the GitHub Release.

## 0) npm OIDC trusted publishing setup (CLI)

The workflow publishes the CLI with `npm publish` from `packages/server` after bumping
the package version to the release tag version.

Checklist:

1. Confirm npm org/user owns package `usemulti`.
2. In npm package settings, configure Trusted Publisher:
   - Provider: GitHub Actions
   - Repository: this repo
   - Workflow file: `.github/workflows/release.yml`
   - Environment (if used): match your npm trusted publishing config
3. Ensure npm account and org policies allow trusted publishing for the package.
4. Re-enable the disabled `publish_cli` workflow job when CLI publishing should run.
5. Create release tag `vX.Y.Z` and push; workflow will:
   - set `packages/server/package.json` version to `X.Y.Z`
   - build web + server
   - run `npm publish --access public --tag latest`

## 1) Dry-run release without signing

Use this first to validate the release pipeline.

1. Confirm no signing secrets are required for this test.
2. Create a test tag:
   - `git tag v0.0.0-test.1`
   - `git push origin v0.0.0-test.1`
3. Wait for `.github/workflows/release.yml` to finish.
4. Verify the GitHub Release contains macOS and Linux desktop artifacts.
5. Download each artifact and sanity-check installation where applicable.

## 2) Apple signing + notarization setup (macOS)

Required secrets used by the workflow:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_API_KEY`
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER`

Checklist:

1. Apple Developer account access:
   - Team has rights to create Developer ID certificates.
2. Create `Developer ID Application` certificate.
3. Export certificate + private key as `.p12` from Keychain.
4. Base64-encode the `.p12` and store as `CSC_LINK`.
5. Store the `.p12` export password as `CSC_KEY_PASSWORD`.
6. In App Store Connect, create an API key (Team key).
7. Add API key values:
   - `APPLE_API_KEY`: contents of the downloaded `.p8`
   - `APPLE_API_KEY_ID`: Key ID
   - `APPLE_API_ISSUER`: Issuer ID
8. Re-run a tag release and confirm macOS artifacts are signed/notarized.

Notes:

- `APPLE_API_KEY` is stored as raw key text in secrets.
- The workflow writes it to a temporary `AuthKey_<id>.p8` file at runtime.

## 3) Ongoing release checklist

1. Ensure `main` is green in CI.
2. Bump app version as needed.
3. Create release tag: `vX.Y.Z`.
4. Push tag.
5. Verify workflow steps:
   - preflight passes
   - all matrix builds pass
   - release job uploads expected files
6. Smoke test downloaded artifacts.

## 4) Troubleshooting

- macOS build unsigned when expected signed:
  - Check all Apple secrets are populated and non-empty.
- Build fails with signing error:
  - Retry with secrets removed to confirm unsigned path still works.
  - Re-check certificate, API key, and notarization configuration.
