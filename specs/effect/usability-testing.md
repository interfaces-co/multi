# Usability Testing Spec

Reliability includes layout and interaction behavior. For app UI cleanup,
browser tests should prove the user-facing surface still works after helper
files disappear.

## Target Testing Shape

Prefer tests at the behavior boundary:

- [ ] Sidebar collapse/expand and section behavior across desktop and compact
      widths.
- [ ] Composer single-line and multi-line transitions.
- [ ] Composer action containment at compact widths.
- [ ] Inline edit immediate focus and matching sent-message bubble geometry.
- [ ] Model picker search, provider switching, and disabled/missing states.
- [ ] Plan workbench rendering, actions, and build handoff.
- [ ] Terminal workbench activation without hidden-panel side effects.
- [ ] Git action error rendering with surfaced command details.

Use smaller unit tests only for pure, durable transforms:

- [ ] Prompt segment parsing.
- [ ] Terminal context serialization.
- [ ] Model resolver output.
- [ ] Route target resolution.
- [ ] Timestamp formatting, if retained as a stable presentation policy.

## Sidebar Coverage

The sidebar is a product surface, not just a store.

- [ ] Add a browser test for desktop width:
  - [ ] project sections render
  - [ ] active thread remains visible
  - [ ] pending/plan badges do not overflow
  - [ ] new-thread action remains reachable
- [ ] Add a browser test for compact width:
  - [ ] collapsed state preserves route
  - [ ] expanding sidebar restores selectable rows
  - [ ] footer/header actions stay inside the rail
- [ ] Add a browser test for worktree threads:
  - [ ] worktree path is displayed or hidden according to the shell rule
  - [ ] selecting a worktree thread updates the composer cwd

Detailed sidebar plan: [sidebar-usability.md](./sidebar-usability.md).

## Composer Coverage

- [x] Browser coverage exists for composer footer containment.
- [x] Browser coverage exists for prompt text, mentions, undo, and surround
      behavior.
- [ ] Add explicit single-line to multi-line mode transition coverage.
- [ ] Add delete-back-to-single-line coverage.
- [ ] Add inline edit click-to-focus latency coverage.
- [ ] Add inline edit height comparison against the source message bubble.
- [x] Add compact model selector overflow coverage.

## Plan Coverage

- [x] Browser coverage exists for native plan workbench rendering.
- [x] Browser coverage exists for plan actions menu and save-to-project path
      copy.
- [ ] Add browser coverage for build-plan handoff from the workbench.
- [ ] Add browser coverage for plan workbench active-tab behavior after route
      changes.
- [ ] Add browser coverage for structured project-write error rendering once
      app error formatting exists.

## Delete-Or-Update Test Rule

When a helper is deleted or inlined:

- [ ] Delete tests that only assert helper internals.
- [ ] Move any real behavior assertion to the nearest browser/integration suite.
- [ ] Keep pure transform tests only when the transform remains a named public
      behavior.
- [ ] Do not keep a helper file solely to keep its test alive.

## Warning Budget

Browser tests should not pass with large expected warning streams.

- [x] Fix WebSocket RPC `Cause` serialization warnings.
- [ ] Fail tests that emit unexpected console errors.
- [ ] Allow specific warnings only with a local explanation and TODO.
- [ ] Keep screenshots only for failures that need visual debugging.

## Verifier Rules

- [ ] For UI layout changes, run the affected browser test.
- [ ] For route/store/model logic changes, run the nearest unit test and one
      behavior test that uses the result.
- [ ] For docs-only spec changes, `git diff --check` is enough unless generated
      docs are involved.
