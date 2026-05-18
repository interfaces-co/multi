# App Toast File Inventory

This inventory classifies the remaining `.logic.ts` file in `packages/app`.
The current conclusion is explicit: `toast.logic.ts` is not a durable boundary.
It should be inlined into the toast renderer or replaced by toast behavior
coverage during a cleanup wave.

Inventory commands:

```bash
find packages/app/src -name '*toast*' -type f | sort
rg -n "toast\\.logic|shouldHideCollapsedToastContent|buildVisibleToastLayout|shouldRenderThreadScopedToast" packages/app/src specs
```

Current files:

- [x] `packages/app/src/app/toast.tsx`
- [x] `packages/app/src/app/toast.logic.ts`
- [x] `packages/app/src/app/toast.logic.test.ts`
- [x] `packages/app/src/components/keybindings-toast.browser.tsx`

## Canonical Toast Boundary

Keep:

- [x] `packages/app/src/app/toast.tsx`: renderer toast boundary and provider
      wiring.

Current responsibilities:

- [x] Creates `toastManager` and `anchoredToastManager`.
- [x] Renders global and anchored Base UI toast providers.
- [x] Filters thread-scoped toasts against the active route thread.
- [x] Computes visible toast stacking offsets.
- [x] Handles visible-only auto-dismiss with pause/resume on focus and
      visibility changes.
- [x] Renders copyable error descriptions for error toasts.

Rules:

- [ ] User-triggered command/provider/git/project errors should reach this
      renderer through a clear app action handler, not an unhandled promise.
- [ ] Error descriptions should keep structured details when transport errors
      provide them.
- [ ] Copy buttons remain for detailed error descriptions unless the callsite
      opts out.

## `.logic.ts` Classification

Inline/delete candidate:

- [x] `packages/app/src/app/toast.logic.ts`

Reasons:

- [x] It has one production caller: `packages/app/src/app/toast.tsx`.
- [x] It exports implementation helpers for toast layout/filtering, not a
      cross-surface domain boundary.
- [x] Its test file asserts helper calculations directly rather than user
      behavior.
- [x] Inlining the helpers into `toast.tsx` would keep ownership local to the
      toast renderer.

Current exports:

- [x] `shouldHideCollapsedToastContent`
- [x] `buildVisibleToastLayout`
- [x] `shouldRenderThreadScopedToast`

Target:

- [ ] Inline these helpers into `toast.tsx` as private functions.
- [ ] Delete `toast.logic.ts`.
- [ ] Delete `toast.logic.test.ts` unless the behavior is not covered by a
      toast/browser behavior suite.
- [ ] If behavior coverage is added, cover visible stacking and thread-scoped
      filtering through rendered toasts, not through helper exports.

## Toast Behavior Coverage Needed

Before deleting the helper test, keep or add behavior coverage for:

- [ ] A toast scoped to the active thread is visible.
- [ ] A toast scoped to another environment/thread is hidden.
- [ ] Global toasts remain visible without thread scope.
- [ ] Multiple visible toasts keep the front-most toast readable in a collapsed
      stack.
- [ ] Error toast descriptions can be copied.
- [ ] Visible-only auto-dismiss pauses while document is hidden or unfocused.

## Error Rendering Follow-Up

The toast renderer is the final UI surface; error normalization should happen
before the toast is created.

- [ ] Add a small structured error formatter only if at least two action
      handlers need the same contract/error extraction.
- [ ] Do not add a universal unknown-error registry.
- [ ] Keep one-off fallback messages at the triggering action handler.
- [ ] Preserve copyable details for Git, provider, project, terminal, and
      schema-backed transport errors.

## Done Means

- [ ] No `*.logic.ts` remains under `packages/app/src/app`.
- [ ] Toast helpers are private to `toast.tsx` or replaced by a real toast
      renderer test boundary.
- [ ] User-visible error actions still surface messages and copyable details.
- [ ] `pnpm run typecheck` passes for code changes.
