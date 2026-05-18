# React Effects Spec

React effects are external-system synchronization tools. They are not the
default way to derive state, reset state, fetch app data, or relay user
actions.

## Current Inventory

Snapshot commands:

```bash
rg --count "\\buseEffect\\b" packages/app/src --glob '!*.test.*' --glob '!*.browser.*'
rg --count "\\buseLayoutEffect\\b" packages/app/src --glob '!*.test.*' --glob '!*.browser.*'
rg -n "useMountEffect|no-direct-use-effect" packages/app/src scripts .oxlintrc.json --glob '!*.test.*' --glob '!*.browser.*'
```

Snapshot result:

- [x] Direct `useEffect` appears only in
      `packages/app/src/hooks/use-mount-effect.ts`, with `2` matches.
- [x] Direct `useLayoutEffect` appears in `6` production app files with `13`
      matches.
- [x] `packages/app/src/hooks/use-mount-effect.ts` defines the mount-only
      external-sync wrapper. Route-level global shortcut listeners,
      `use-copy-to-clipboard` timer cleanup, and thread jump hint controller
      cleanup now use it.
- [x] Direct effect callsite classification is captured in
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
- [x] One-time external sync uses a dedicated `useMountEffect` wrapper.

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

- [x] The wrapper is the only file allowed to import and call React
      `useEffect` directly once the lint rule is active.
- [x] The wrapper name makes mount-only external sync explicit.
- [ ] Do not use the wrapper to hide prop synchronization. If the behavior
      depends on an ID, remount the child with `key`.
- [ ] Do not use the wrapper for data fetching. Use React Query.

## Lint Target

The repository currently uses `oxlint` with the local
`scripts/oxlint-plugin-multi.js` plugin.

- [x] Add a `multi/no-direct-use-effect` rule after the wrapper exists.
- [x] The rule should reject direct `useEffect` imports and
      `React.useEffect(...)` calls outside the wrapper file.
- [ ] The rule should allow `useLayoutEffect` only while the layout-effect
      migration remains explicitly tracked in this spec.
- [x] `pnpm exec oxlint --report-unused-disable-directives --deny-warnings`
      stays clean with the rule enabled as `error`.

## Migration Order

1. [x] Add `useMountEffect`.
2. [x] Read every direct `useEffect` callsite and classify it in this spec or a
       linked inventory.
3. [x] Remove derived-state effects first.
4. [x] Remove action-relay effects second.
5. [x] Replace reset effects with keyed component boundaries.
6. [x] Keep true external sync effects, but move them behind
       `useMountEffect`, focused hooks, or owned integration components.
7. [x] Enable `multi/no-direct-use-effect` with warnings denied.

## First Classification Buckets

No count-only direct-effect files remain.

## Done Means

- [x] New React code has no direct `useEffect`.
- [x] Existing direct effects are either removed or classified as external
      sync.
- [x] External sync lives in focused hooks or integration components.
- [x] Derived state stays derived in render.
- [x] User actions stay in handlers.
- [x] The lint rule prevents regression.
