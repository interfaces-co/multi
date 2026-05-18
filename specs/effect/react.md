# React Effects Spec

React effects are external-system synchronization tools. They are not the
default way to derive state, reset state, fetch app data, or relay user
actions.

## Current Inventory

Snapshot commands:

```bash
rg --count "\\buseEffect\\b" packages/app/src --glob '!*.test.*' --glob '!*.browser.*'
rg --count "\\buseLayoutEffect\\b" packages/app/src --glob '!*.test.*' --glob '!*.browser.*'
rg -n "useMountEffect" packages/app/src --glob '!*.test.*' --glob '!*.browser.*'
```

Snapshot result:

- [x] Direct `useEffect` appears in `49` production app files with `182`
      matches.
- [x] Direct `useLayoutEffect` appears in `6` production app files with `14`
      matches.
- [x] No `useMountEffect` callsites were found in `packages/app/src`.
- [~] Direct effect callsite classification is being captured in
  [react-effect-callsite-inventory.md](./react-effect-callsite-inventory.md).

## Rule

Never add a direct `useEffect` call in new React code.

Allowed replacement patterns:

- [ ] Derived state from props, queries, stores, or local state is computed
      inline during render.
- [ ] Data fetching uses React Query or the existing environment API query
      hooks.
- [ ] User actions run in event handlers, command handlers, or keybinding
      actions.
- [ ] State reset uses a keyed component boundary when the entity identity
      changes.
- [ ] One-time external sync uses a dedicated `useMountEffect` wrapper.

Allowed external sync categories:

- [ ] DOM focus, measurement, scroll, and selection integration.
- [ ] Browser API subscriptions.
- [ ] `ResizeObserver`, `IntersectionObserver`, and event listeners.
- [ ] xterm, Monaco-like editors, workers, notifications, clipboard timers, and
      platform APIs.
- [ ] Cleanup for external resources created by the component.

Not allowed:

- [ ] `useEffect(() => setX(deriveFromY(y)), [y])`.
- [ ] `set flag -> effect runs -> reset flag` action relays.
- [ ] Route/search/store synchronization that can be represented as a route
      action, loader, query option, or keyed render boundary.
- [ ] Direct effect-based fetch logic that duplicates React Query caching,
      cancellation, retry, or stale handling.
- [ ] Effects added only to make tests easier.

## Escape Hatch

Add one wrapper before enforcing the rule:

```ts
export function useMountEffect(effect: () => void | (() => void)) {
  useEffect(effect, []);
}
```

Rules:

- [ ] The wrapper is the only file allowed to import and call React
      `useEffect` directly once the lint rule is active.
- [ ] The wrapper name makes mount-only external sync explicit.
- [ ] Do not use the wrapper to hide prop synchronization. If the behavior
      depends on an ID, remount the child with `key`.
- [ ] Do not use the wrapper for data fetching. Use React Query.

## Lint Target

The repository currently uses `oxlint` with the local
`scripts/oxlint-plugin-multi.js` plugin.

- [ ] Add a `multi/no-direct-use-effect` rule after the wrapper exists.
- [ ] The rule should reject direct `useEffect` imports and
      `React.useEffect(...)` calls outside the wrapper file.
- [ ] The rule should allow `useLayoutEffect` only while the layout-effect
      migration remains explicitly tracked in this spec.
- [ ] `pnpm exec oxlint --report-unused-disable-directives --deny-warnings`
      must stay clean when the rule is enabled.

## Migration Order

1. [ ] Add `useMountEffect`.
2. [ ] Read every direct `useEffect` callsite and classify it in this spec or a
       linked inventory.
3. [ ] Remove derived-state effects first.
4. [ ] Remove action-relay effects second.
5. [ ] Replace reset effects with keyed component boundaries.
6. [ ] Keep true external sync effects, but move them behind
       `useMountEffect`, focused hooks, or owned integration components.
7. [ ] Enable `multi/no-direct-use-effect` with warnings denied.

## First Classification Buckets

Read these files before editing. The counts are inventory facts only.

- [ ] `packages/app/src/components/chat/view/chat-view.tsx` has `19`
      `useEffect` matches.
- [ ] `packages/app/src/components/thread-terminal-drawer.tsx` has `10`
      `useEffect` matches.
- [ ] `packages/app/src/components/chat/composer/input.tsx` has `8`
      `useEffect` matches and `2` `useLayoutEffect` matches.
- [ ] `packages/app/src/components/web-socket-connection-surface.tsx` has `7`
      `useEffect` matches.
- [ ] `packages/app/src/app/routes/root-route.tsx` has `7` `useEffect`
      matches.
- [ ] `packages/app/src/components/shell/files/project-file-tree.tsx` has `7`
      `useEffect` matches.
- [ ] `packages/app/src/components/diff-panel.tsx` has `6` `useEffect`
      matches.
- [ ] `packages/app/src/components/shell/agents/list.tsx` has `6`
      `useEffect` matches.
- [ ] `packages/app/src/components/chat/timeline/messages-timeline.tsx` has
      `6` `useEffect` matches.

## Done Means

- [ ] New React code has no direct `useEffect`.
- [ ] Existing direct effects are either removed or classified as external
      sync.
- [ ] External sync lives in focused hooks or integration components.
- [ ] Derived state stays derived in render.
- [ ] User actions stay in handlers.
- [ ] The lint rule prevents regression.
