# Engineering Guide

Durable rules for Multi. Cleanup history and wave inventories live in
[docs/](../docs/). Open work: [todo.md](./todo.md).

## Packages

- `packages/contracts`: schema-backed IDs, DTOs, events, RPC, transport errors.
- `packages/server`: services, providers, orchestration, persistence, HTTP/WS.
- `packages/app`: TanStack React UI, stores, environment APIs.

Contracts stay runtime-neutral. Server owns side effects and expected failures.
App renders state and calls environment APIs; it does not fork domain contracts.

## Server services

One `*.service.ts` contract plus a sibling implementation when the boundary is
shared or effectful.

- Public methods use traced `Effect.fn("Service.method")`.
- Method signatures expose typed expected error unions.
- Implementation helpers stay private unless another module has a durable reason
  to import them.
- Do not add async facades around services unless they are a real runtime bridge.
- Do not add `.logic.ts` or root helper modules for single call sites.

`packages/server/src/server-runtime.ts` is the only `ManagedRuntime.make`
boundary. Assemble Effect layers at startup; do not add service-local runtimes.

## Errors

Expected failures use `Schema.TaggedErrorClass` on the Effect error channel.
Reserve `throw`, plain `Error`, and `Effect.die` for impossible states, wiring
bugs, and test stubs—not validation, missing resources, or user-triggered
failures.

Remaining production `Effect.die` (convert when touching these files):

- `packages/server/src/persistence/NodeSqliteClient.ts`
- `packages/server/src/provider/ProviderService.ts`
- `packages/server/src/orchestration/ProviderCommandReactor.ts` (two paths)

Transport rules:

- Services stay transport-agnostic (no React, toasts, or router types).
- HTTP/WebSocket handlers map service errors to contract errors in
  `packages/contracts`.
- Keep one-off translations inline at the handler; extract only when a pattern
  repeats. Do not grow a universal `unknown -> status` registry.
- Preserve public wire bodies unless the contract change is intentional.

App rules:

- Surface command/provider/git failures where the action was triggered.
- Render structured messages with copyable details when available.
- Do not leave unhandled promise rejections on user actions.

Reference: `packages/server/src/provider/Errors.ts`,
`packages/server/src/orchestration/Errors.ts`.

## Schemas

Effect Schema is the source of truth.

- Public shapes live in `packages/contracts`.
- Server aliases contract schemas (for example `orchestration/Schemas.ts`); do
  not fork payloads.
- New provider, git, project, terminal, and orchestration contracts start in
  contracts, not app stores or renderer helpers.
- Hoist schema decoders/encoders; `multi/no-inline-schema-compile` enforces this.
- App stores persist facts, not editor-internal JSON.
- Model catalogs are provider/runtime-owned; contracts expose capability schemas,
  not per-provider model constants.

## Routes

**Server:** `http.ts`, `ws.ts`, `contracts/src/rpc.ts`. Handlers translate
expected errors to contract types. Raw HTTP stays limited to static/dev, auth,
attachments, health, and WebSocket upgrade.

**App:** TanStack route files under `packages/app/src/routes` and
`packages/app/src/app/routes` validate params/search only. They do not own model
resolution, plan orchestration, or composer policy.

WebSocket RPC method names are explicit in `packages/contracts/src/rpc.ts`. App
code calls the environment API, not server internals.

## App files

Cleanup target: fewer ownership mysteries, not fewer files at any cost.

**Keep** when the file owns a runtime boundary (RPC, storage, terminal/xterm,
route contract, generated route tree), is imported by multiple surfaces with a
stable domain name, or isolates a third-party/platform edge.

**Inline** when there is one production caller, the name is mechanical, and
inlining stays readable.

**Delete** when there are no production callers, the surface was removed, or the
file only mirrors a contract type.

- No new `.logic.ts` files.
- CSS stays for tokens, global renderer contracts, or external renderer
  integration (xterm, diff host).
- Before deleting a helper, run caller inventory (`rg`, `knip`) and cover
  behavior with a browser/integration test at the product boundary.

Shell owns layout and panels. Composer owns prompt text, attachments, slash menu,
and send preparation (plain text, not editor JSON). Model policy lives in
`packages/app/src/model`; pickers consume normalized resolver output.

Supported drivers: `codex`, `claudeAgent`, `opencode`, `cursor`. `pi` is
pending only and must not run sessions.

Proposed-plan server chain and native plan workbench are canonical product
surfaces—do not delete them as helper cleanup.

## Shared package

`@multi/shared` exports small cross-package primitives, not app policy.

- `@multi/shared/observability` is canonical for tracing.
- `@multi/shared/model` holds primitive helpers; resolver policy stays in app.
- `@multi/shared/project-scripts` is canonical for project-script runtime.
- Reclassify one-consumer exports before keeping them public.

## React effects

No direct `useEffect` or `useLayoutEffect` in app code. Allowed only in
`packages/app/src/hooks/use-mount-effect.ts` and
`use-layout-sync-effect.ts`. `multi/no-direct-use-effect` is enabled.

Use instead:

- Render-time derivation for props, stores, and query data.
- React Query / environment API for fetching.
- Event handlers and keybindings for user actions.
- Keyed boundaries when entity identity changes.

Allowed external sync (via wrappers or focused integration components): DOM
focus/measurement/scroll, observers, browser subscriptions, xterm/editors,
workers, timers, cleanup.

Not allowed: prop-to-state effects, action relays, route sync that belongs in
loaders or keyed boundaries, effect-based fetch duplicating React Query, effects
for test convenience only.

Inactive workbench panels must not mount side-effectful bodies (for example
terminal hosts).

## Tests

Prefer browser tests for sidebar, shell, composer, model picker, plan workbench,
and terminal activation. Keep unit tests for pure transforms with stable
inputs/outputs. Delete helper tests when the helper is inlined; do not keep a
file only because it has a test.

## Verification

Default: `pnpm run typecheck`.

Run focused tests only when creating, changing, or debugging tests. For UI
layout/interaction changes, verify rendered behavior. For service boundary
changes, verify the error channel and public HTTP/RPC shape.
