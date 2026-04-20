# Upstream sync

Multi is a fork of `[pingdotgg/t3code](https://github.com/pingdotgg/t3code)`. The upstream
project is tracked as the `upstream` git remote so we can re-sync provider code (Codex,
Claude, Cursor, OpenCode and the ACP infrastructure) without losing local changes.

## Remote setup (one-time)

```bash
git remote add upstream https://github.com/pingdotgg/t3code.git
git fetch upstream main
```

## Current baseline

| Item            | Value                                               |
| --------------- | --------------------------------------------------- |
| Upstream commit | `c83bc5d48a2bf983acb1c8aaff3d34f86c14032e`          |
| Date pinned     | 2026-04-19                                          |
| Reason          | Baseline for Cursor + OpenCode port (PR 0 / 1 / 2). |

Bump this table whenever you re-sync — keep the SHA, date, and a one-line reason.

## Naming convention for upstream-tracked files

Files that exist in both Multi and t3code use **upstream's casing** (camelCase for shared
helpers, PascalCase for Effect Layer/Service files) so `git diff upstream/main -- <path>`
stays readable. Files that are entirely new to Multi with no upstream counterpart use
Multi's kebab-case convention.

## Re-sync recipe

To see what has drifted in upstream since the last pin:

```bash
git fetch upstream main

# Provider runtime + ACP
git diff upstream/main -- apps/server/src/provider apps/server/src/git/Layers

# Contracts surface
git diff upstream/main -- packages/contracts/src

# Web composer / model picker / settings
git diff upstream/main -- apps/web/src

# Internal effect-acp package
git diff upstream/main -- packages/effect-acp
```

To pull individual file updates from upstream:

```bash
git checkout upstream/main -- apps/server/src/provider/Layers/CursorAdapter.ts
```

After resolving the diff, update the table above with the new pinned SHA.
