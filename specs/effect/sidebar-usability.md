# Sidebar Usability Spec

The sidebar is a product workflow surface. Cleanup of `thread-sidebar.ts`,
`sidebar-chat-view-model.ts`, `thread-unread-store.ts`, shell panel state, or
sidebar row components requires browser coverage at the user-facing boundary,
not only helper tests.

## Current Coverage

Existing browser coverage:

- [x] `packages/app/src/components/shell/agents/list.browser.tsx` verifies
      compact selected-row geometry and rename-mode row geometry.
- [x] `packages/app/src/components/chat/view/chat-view.browser.tsx` verifies
      archive from sidebar row context menu.
- [x] `packages/app/src/components/chat/view/chat-view.browser.tsx` verifies
      full thread title on the sidebar row.
- [x] `packages/app/src/components/chat/view/chat-view.browser.tsx` verifies
      command palette shortcut rendering and running from the sidebar trigger.
- [x] `packages/app/src/components/chat/view/chat-view.browser.tsx` verifies
      adding a project from the sidebar add button.
- [x] `packages/app/src/components/chat/view/chat-view.browser.tsx` verifies
      some worktree draft/thread flows, but not as sidebar layout behavior.

Current test viewport facts:

- [x] Chat-view browser harness has `DEFAULT_VIEWPORT` at `960x1100`.
- [x] Chat-view browser harness has `WIDE_FOOTER_VIEWPORT` at `1400x1100`.
- [x] Chat-view browser harness has `COMPACT_FOOTER_VIEWPORT` at `430x932`.
- [x] Existing sidebar behavior tests mostly run at `DEFAULT_VIEWPORT`.

## Coverage Gaps

Desktop sidebar:

- [ ] Project sections render with thread and draft rows.
- [ ] Active thread remains visible and selected after route changes.
- [ ] Pending approval, pending input, running, completed, unread, and plan-ready
      indicators fit inside the row.
- [ ] New-thread action remains reachable for a project section.
- [ ] Sidebar footer/header actions stay inside the rail.
- [ ] Row context menu remains reachable without shifting row geometry.

Compact sidebar:

- [ ] The left rail can collapse and expand without changing the route.
- [ ] Collapsed state hides row content from interaction and accessibility.
- [ ] Expanding restores selectable rows and project sections.
- [ ] Header/footer/actions do not overflow the composer or viewport.
- [ ] Thread rows keep stable height, status slot, title slot, and time slot.

Worktree sidebar:

- [ ] Worktree thread rows show or hide path/branch according to the shell rule.
- [ ] Selecting a worktree thread updates composer cwd and terminal cwd.
- [ ] Creating a new thread from a worktree project preserves the intended
      draft env mode.
- [ ] Active worktree path is used for plan save-to-project actions.

State behavior:

- [ ] `ui-state-store` visited state and `thread-unread-store` unread state are
      reconciled into one user-visible unread rule.
- [ ] Project expansion state persists across route changes.
- [ ] Project ordering remains stable after projects are added/removed.
- [ ] Prewarm IDs are limited to visible rows.

## Test Targets

Add focused browser tests before deleting sidebar helper files:

- [ ] `desktop sidebar renders project sections and active thread`
  - viewport: `DEFAULT_VIEWPORT`
  - asserts project section labels, active row, visible row status/time slots,
    and new-thread affordance.
- [ ] `compact sidebar collapse preserves route and containment`
  - viewport: `COMPACT_FOOTER_VIEWPORT`
  - toggles sidebar closed/open, asserts URL unchanged, rows restored, and no
    visible action outside the sidebar rail.
- [ ] `sidebar worktree thread updates composer cwd`
  - viewport: `DEFAULT_VIEWPORT`
  - selects worktree row and asserts composer/terminal cwd uses the worktree
    path.
- [ ] `sidebar indicators fit in narrow rows`
  - viewport: a narrow-but-expanded sidebar width from shell panel store
  - asserts pending/plan/unread indicators do not overlap title/time slots.

## Deletion Gates

Before moving or deleting these files:

- [ ] `packages/app/src/lib/thread-sidebar.ts`
- [ ] `packages/app/src/lib/sidebar-chat-view-model.ts`
- [ ] `packages/app/src/lib/thread-sort.ts`
- [ ] `packages/app/src/stores/thread-unread-store.ts`
- [ ] `packages/app/src/stores/ui-state-store.ts`
- [ ] `packages/app/src/components/shell/agents/list.tsx`
- [ ] `packages/app/src/components/shell/agents/row.tsx`
- [ ] `packages/app/src/components/shell/sidebar/thread-rail.tsx`

Required evidence:

- [ ] At least one desktop sidebar browser test covers the behavior.
- [ ] At least one compact sidebar browser test covers the behavior.
- [ ] If a helper unit test is deleted, its retained behavior is represented in
      the browser suite or explicitly removed from product scope.
- [ ] `pnpm run typecheck` passes for code changes.

## Done Means

- [ ] Sidebar behavior is verified at desktop and compact widths.
- [ ] Sidebar cleanup no longer relies on helper-only tests as the main safety
      net.
- [ ] Project, thread, draft, unread, pending, plan, and worktree states are
      visible in behavior tests.
- [ ] Route preservation is verified when collapsing/expanding the sidebar.
