# App Root File Inventory

This is the first-pass classification for root-level files in
`packages/app/src`. It exists so cleanup waves can delete, move, or inline files
without re-litigating ownership from scratch.

Inventory command:

```bash
find packages/app/src -maxdepth 1 -type f \( -name '*.ts' -o -name '*.tsx' \) | sort
```

Current count:

- [x] `16` root app `ts` / `tsx` files remain after the route, plan,
      pending-input, worktree, project-script, auth, branding, Git, terminal
      link, chat VSCode icon, appearance boot, editor preference, and runtime
      orchestration, context-menu browser fallback, and environment RPC client
      owner moves.

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
- [x] Delete root `ws-rpc-client.ts`; environment-scoped client lookup now
      lives under `environments/runtime`, and raw RPC client types/creation stay
      under `rpc/ws-rpc-client.ts`.
- [ ] Split `types.ts` only when each extracted type has a clearer owner.

## Move Into Existing Directories

These are probably real boundaries, but root placement makes the app harder to
scan.

- [x] `appearance-boot.ts` - moved under `app/` as the renderer startup
      appearance/host marker side-effect module.
- [x] `chat-route-persistence.ts` - moved to
      `app/routes/chat-route-persistence.ts`.
- [x] `context-menu-fallback.ts` - moved to `browser/context-menu-fallback.ts`
      as the non-Electron context menu adapter used by `local-api`.
- [x] `editor-preferences.ts` - moved to `editor/preferences.ts` as the
      preferred external-editor persistence and launch policy.
- [x] `orchestration-event-effects.ts` - moved to
      `environments/runtime/orchestration-event-effects.ts` next to the runtime
      event consumer.
- [x] `pending-user-input.ts` - moved next to the pending-user-input composer
      panel.
- [x] `proposed-plan.ts` - moved to `plan/proposed-plan.ts`.
- [x] `terminal-links.ts` - moved to `lib/terminal-links.ts` as a shared
      terminal/link parsing boundary used by terminal, diff, and chat link
      renderers.
- [x] `thread-routes.ts` - moved to `app/routes/thread-route-targets.ts`.
- [x] `vscode-icons.ts` - moved to
      `components/chat/shared/vscode-entry-icons.ts` as the chat mention/file
      link icon URL resolver.

Pending follow-up:

- [ ] Move or inline one file at a time and update imports explicitly.
- [ ] Keep tests only when they still verify a durable boundary after the move.

## Inline Or Delete Candidates

These files need caller inventory before code changes. Their root placement and
size suggest they should not remain root-level helpers.

- [x] `branding.ts` - moved under app branding ownership.
- [x] `diff-route-search.ts` - moved to `app/routes/chat-shell-search.ts` while
      multiple route/component boundaries share the search shape.
- [x] `file-path-display.ts` - moved under chat shared display ownership.
- [x] `logical-project.ts` - moved to `stores/project-identity.ts`.
- [x] `pairing-url.ts` - moved into primary auth bootstrap ownership.
- [x] `pull-request-reference.ts` - moved under Git ownership.
- [x] `worktree-cleanup.ts` - moved to `git/worktree-cleanup.ts`.

Pending follow-up:

- [ ] For each candidate, run `rg` caller inventory.
- [ ] If one production caller remains, inline unless the helper is a named
      domain parser with a useful test.
- [ ] If tests only duplicate the parser implementation, replace them with a UI
      or workflow behavior test before deleting.

## Keep As Pure Domain Helpers For Now

These are root-level today but have stable, testable pure behavior.

- [x] `vscode-icons.ts` - moved to chat shared icon ownership.
- [x] `terminal-links.ts` - moved to `lib/terminal-links.ts`.
- [x] `pending-user-input.ts` - moved with retained pending composer behavior.
- [x] `proposed-plan.ts` - moved after plan workbench actions stabilized.

Pending follow-up:

- [ ] Reclassify these after their behavior is covered by integration/browser
      tests or moved to a clearer owner.

## Test Files

Root tests should either test a retained root boundary or move with the file
they cover.

- [x] `auth-bootstrap.test.ts` - moved under primary environment auth/bootstrap
      ownership.
- [x] `branding.test.ts` - moved with `branding.ts`.
- [x] `chat-route-persistence.test.ts` - moved with route persistence owner.
- [x] `diff-route-search.test.ts` - moved with the retained route-search
      contract.
- [x] `environment-grouping.test.ts` - moved with environment/store grouping
      behavior.
- [x] `file-path-display.test.ts` - moved with file display helper.
- [x] `keybindings.test.ts` - keep with keybindings boundary.
- [x] `local-api.test.ts` - keep with local API boundary.
- [x] `orchestration-event-effects.test.ts` - moved with runtime
      orchestration event effects.
- [x] `pending-user-input.test.ts` - moved with the pending composer input
      reducer.
- [x] `project-scripts.test.ts` - moved next to `lib/project-scripts.ts`.
- [x] `proposed-plan.test.ts` - moved with plan owner.
- [x] `pull-request-reference.test.ts` - moved with PR parser.
- [x] `session-logic.test.ts` - keep while `session-logic.ts` is a major derived
      projection boundary.
- [x] `terminal-links.test.ts` - moved with terminal links.
- [x] `terminal-state-store.test.ts` - keep with terminal state store.
- [x] `thread-routes.test.ts` - moved with route helpers.
- [x] `vscode-icons.test.ts` - moved with chat shared icon URL resolution.
- [x] `worktree-cleanup.test.ts` - moved with worktree cleanup helper.

Pending follow-up:

- [ ] Delete no test until its behavior is either intentionally removed or
      covered by a behavior suite.
- [ ] Prefer browser tests for sidebar, shell, composer, picker, and plan
      behavior before deleting helper-level tests.

## First Root Cleanup Candidates

Start here because the blast radius is small and the desired owner is visible.

- [x] `branding.ts` + `branding.test.ts` - move under app/shell desktop
      branding ownership or inline constants where used.
- [x] `diff-route-search.ts` + `diff-route-search.test.ts` - moved under
      `app/routes` as `chat-shell-search.ts` because TanStack route ownership
      owns the shared chat shell search parser.
- [x] `pull-request-reference.ts` + `pull-request-reference.test.ts` - move
      under pull request dialog/Git ownership.
- [x] `pairing-url.ts` - move under auth bootstrap ownership.
- [x] `worktree-cleanup.ts` + `worktree-cleanup.test.ts` - move under Git
      worktree ownership or inline into the cleanup caller.
- [x] `vscode-icons.ts` + `vscode-icons.test.ts` - moved under chat shared
      file icon ownership.

## Do Not Touch Without A Larger Plan

- [ ] `session-logic.ts` / `session-logic.test.ts` - too central for incidental
      cleanup.
- [ ] `types.ts` - type extraction can easily create more files without making
      ownership clearer.
- [ ] `terminal-state-store.ts` - real state owner with broad behavior.
- [ ] `local-api.ts` / `environment-api.ts` - runtime adapter boundaries.
