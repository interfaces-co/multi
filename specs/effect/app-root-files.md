# App Root File Inventory

This is the first-pass classification for root-level files in
`packages/app/src`. It exists so cleanup waves can delete, move, or inline files
without re-litigating ownership from scratch.

Inventory command:

```bash
find packages/app/src -maxdepth 1 -type f \( -name '*.ts' -o -name '*.tsx' \) | sort
```

Current count:

- [x] `49` root app `ts` / `tsx` files were classified.

## Status Rule

- `[x]` means the file has been classified in this spec.
- `[ ]` means an implementation action is still pending.

## Keep As Root Boundaries

These files are acceptable root-level app boundaries for now.

- [x] `main.tsx` - renderer entrypoint.
- [x] `router.ts` - TanStack router construction.
- [x] `routeTree.gen.ts` - generated TanStack route tree.
- [x] `vite-env.d.ts` - Vite type environment.
- [x] `env.ts` - host/Electron detection and host markers.
- [x] `environment-api.ts` - environment-scoped API adapter boundary.
- [x] `local-api.ts` - primary local API adapter boundary.
- [x] `ws-rpc-client.ts` - compatibility export for current RPC client access.
- [x] `types.ts` - app-wide UI/domain view types; keep until state contracts are
      reduced enough to split or move safely.
- [x] `keybindings.ts` - configurable input/action matching boundary.
- [x] `session-logic.ts` - large derived timeline/worklog/proposed-plan
      projection boundary; too large, but not a one-off helper.
- [x] `terminal-state-store.ts` - terminal UI state owner.
- [x] `thread-derivation.ts` - thread materialization from normalized store
      facts.

Pending follow-up:

- [ ] Shrink `session-logic.ts` by extracting or deleting behavior only after a
      behavior inventory proves the target slices.
- [ ] Decide whether `ws-rpc-client.ts` can be removed after all callers import
      from `rpc/ws-rpc-client.ts` or environment APIs directly.
- [ ] Split `types.ts` only when each extracted type has a clearer owner.

## Move Into Existing Directories

These are probably real boundaries, but root placement makes the app harder to
scan.

- [x] `appearance-boot.ts` - boot side effects; move under `app/` or inline into
      `main.tsx` if readability stays clear.
- [x] `chat-route-persistence.ts` - route persistence; move under `app/` or
      `thread-routes` ownership.
- [x] `context-menu-fallback.ts` - browser fallback for desktop context menu;
      move under a platform/browser adapter directory if retained.
- [x] `editor-preferences.ts` - editor selection persistence and launch helper;
      move under editor/platform ownership.
- [x] `orchestration-event-effects.ts` - batch side-effect derivation for store
      updates; move under orchestration/store ownership.
- [x] `pending-user-input.ts` - pending-question draft reducer; move next to the
      pending-user-input composer panel if retained.
- [x] `proposed-plan.ts` - proposed-plan markdown/action helpers; move under
      shell plan or chat plan ownership after the plan surface settles.
- [x] `terminal-links.ts` - terminal link parser/resolver; move under
      shell/terminal if all callers are terminal surfaces.
- [x] `thread-routes.ts` - route target helpers; move under `app/routes` if the
      route layer owns it.
- [x] `vscode-icons.ts` - file icon lookup; move near file tree / file icon UI.

Pending follow-up:

- [ ] Move or inline one file at a time and update imports explicitly.
- [ ] Keep tests only when they still verify a durable boundary after the move.

## Inline Or Delete Candidates

These files need caller inventory before code changes. Their root placement and
size suggest they should not remain root-level helpers.

- [x] `branding.ts` - tiny desktop-injected branding constants; candidate to
      move under app shell/desktop ownership.
- [x] `diff-route-search.ts` - route search parser; candidate to inline into
      route ownership unless multiple route families truly share it.
- [x] `file-path-display.ts` - presentation helper; candidate to move near file
      display UI or inline if callers are narrow.
- [x] `logical-project.ts` - project grouping key helpers; candidate to move
      into store/sidebar projection ownership.
- [x] `pairing-url.ts` - pairing token URL helpers; candidate to move into auth
      bootstrap ownership.
- [x] `pull-request-reference.ts` - PR reference parser; candidate to move under
      Git/PR dialog ownership.
- [x] `worktree-cleanup.ts` - worktree cleanup display/orphan helper; candidate
      to move under Git/worktree ownership.

Pending follow-up:

- [ ] For each candidate, run `rg` caller inventory.
- [ ] If one production caller remains, inline unless the helper is a named
      domain parser with a useful test.
- [ ] If tests only duplicate the parser implementation, replace them with a UI
      or workflow behavior test before deleting.

## Keep As Pure Domain Helpers For Now

These are root-level today but have stable, testable pure behavior.

- [x] `vscode-icons.ts` - keep until file tree/file icon ownership is chosen.
- [x] `terminal-links.ts` - keep until terminal ownership move is done.
- [x] `pending-user-input.ts` - keep until pending composer tests cover the same
      behavior.
- [x] `proposed-plan.ts` - keep until plan workbench actions stabilize.

Pending follow-up:

- [ ] Reclassify these after their behavior is covered by integration/browser
      tests or moved to a clearer owner.

## Test Files

Root tests should either test a retained root boundary or move with the file
they cover.

- [x] `auth-bootstrap.test.ts` - tests auth/bootstrap behavior; keep only while
      auth bootstrap remains root-coupled.
- [x] `branding.test.ts` - move/delete with `branding.ts`.
- [x] `chat-route-persistence.test.ts` - move with route persistence owner.
- [x] `diff-route-search.test.ts` - delete if parser is inlined into route
      tests.
- [x] `environment-grouping.test.ts` - likely belongs with environment/store
      grouping behavior.
- [x] `file-path-display.test.ts` - move/delete with file display helper.
- [x] `keybindings.test.ts` - keep with keybindings boundary.
- [x] `local-api.test.ts` - keep with local API boundary.
- [x] `orchestration-event-effects.test.ts` - move with orchestration/store
      owner.
- [x] `pending-user-input.test.ts` - replace or move after pending composer
      behavior coverage is sufficient.
- [x] `project-scripts.test.ts` - root test without root implementation file;
      assign to project scripts owner.
- [x] `proposed-plan.test.ts` - move with plan owner when `proposed-plan.ts`
      moves.
- [x] `pull-request-reference.test.ts` - move/delete with PR parser.
- [x] `session-logic.test.ts` - keep while `session-logic.ts` is a major derived
      projection boundary.
- [x] `terminal-links.test.ts` - move with terminal links.
- [x] `terminal-state-store.test.ts` - keep with terminal state store.
- [x] `thread-routes.test.ts` - move with route helpers.
- [x] `vscode-icons.test.ts` - move with file icon lookup.
- [x] `worktree-cleanup.test.ts` - move/delete with worktree cleanup helper.

Pending follow-up:

- [ ] Delete no test until its behavior is either intentionally removed or
      covered by a behavior suite.
- [ ] Prefer browser tests for sidebar, shell, composer, picker, and plan
      behavior before deleting helper-level tests.

## First Root Cleanup Candidates

Start here because the blast radius is small and the desired owner is visible.

- [ ] `branding.ts` + `branding.test.ts` - move under app/shell desktop
      branding ownership or inline constants where used.
- [ ] `diff-route-search.ts` + `diff-route-search.test.ts` - decide whether
      TanStack route ownership should own this parser directly.
- [ ] `pull-request-reference.ts` + `pull-request-reference.test.ts` - move
      under pull request dialog/Git ownership.
- [ ] `pairing-url.ts` - move under auth bootstrap ownership.
- [ ] `worktree-cleanup.ts` + `worktree-cleanup.test.ts` - move under Git
      worktree ownership or inline into the cleanup caller.

## Do Not Touch Without A Larger Plan

- [ ] `session-logic.ts` / `session-logic.test.ts` - too central for incidental
      cleanup.
- [ ] `types.ts` - type extraction can easily create more files without making
      ownership clearer.
- [ ] `terminal-state-store.ts` - real state owner with broad behavior.
- [ ] `local-api.ts` / `environment-api.ts` - runtime adapter boundaries.
