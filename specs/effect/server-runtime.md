# Server Runtime And Effect Spec

This spec is the server-side companion to the app cleanup specs. It mirrors the
opencode Effect roadmap where it applies to Multi: keep typed services and one
runtime boundary, remove accidental facades, and make route error contracts
explicit.

## Reference Inputs

- [x] opencode `specs/effect/guide.md` was read for service shape, runtime
      boundary, errors, schemas, preferred services, and verification rules.
- [x] opencode `specs/effect/facades.md` was read for `makeRuntime(...)`
      facade-removal rules and done criteria.
- [x] opencode `specs/effect/server-package.md` was read for package extraction
      and dependency-direction rules.
- [x] `pi` package surfaces were sampled for small curated exports and direct
      package-boundary tests.

## Current Inventory

Inventory commands:

```bash
find packages/server/src -type f -name '*.service.ts' | wc -l
rg -n "ManagedRuntime\.make|makeRuntime\(" packages/server/src packages/shared/src packages/contracts/src --glob '*.ts'
rg -n "Effect\.die" packages/server/src packages/contracts/src --glob '*.ts'
rg -n "HttpServerResponse\.(text|jsonUnsafe)|respondTo.*Error|catchTag" packages/server/src/http.ts packages/server/src/ws.ts packages/server/src/orchestration/http.ts packages/server/src/auth/http.ts --glob '*.ts'
```

Current facts:

- [x] `packages/server/src` has `229` source files.
- [x] `packages/server/src` has `62` `*.service.ts` service contract files.
- [x] `ManagedRuntime.make` appears once, in
      `packages/server/src/server-runtime.ts`.
- [x] No service-local `makeRuntime(...)` facade callsites were found outside
      the central server runtime wrapper.
- [x] Current non-central Effect callback bridges are real runtime-edge
      adapters, not service-local runtimes: terminal PTY callbacks re-enter the
      manager context with `Effect.runForkWith`, and Claude SDK permission /
      stream callbacks re-enter the adapter session context with
      `Effect.runForkWith` / `Effect.runPromiseWith`.
- [x] `packages/server/src/git/OpenCodeTextGeneration.ts` maps SDK runtime
      failures and expected missing session / prompt error / empty output cases
      into the existing `TextGenerationError` service error channel instead of
      throwing generic `Error` values inside its text-generation path.
- [x] `packages/server/src/terminal/Manager.ts` maps PTY process
      write/resize throws into the public `TerminalProcessOperationError`
      branch of `TerminalError` instead of letting user-triggered terminal
      operations die as defects.
- [x] `packages/server/src/terminal/NodePTY.ts` and
      `packages/server/src/terminal/BunPTY.ts` map native spawn exceptions into
      `PtySpawnError`, matching the PTY adapter service contract and preserving
      terminal-manager shell fallback handling.
- [x] `Effect.die` appears in four current server callsites across
      `provider/ProviderService.ts`,
      `orchestration/ProviderCommandReactor.ts`, and
      `persistence/NodeSqliteClient.ts`. The former Bun PTY Windows unavailable
      path now fails through `PtySpawnError`.
- [x] HTTP route groups already have mixed behavior: auth routes share
      `respondToAuthError`, orchestration routes map tagged errors locally, and
      static/attachment/favicon routes still return plain text status bodies.

## Runtime Boundary

`packages/server/src/server-runtime.ts` is the canonical runtime assembly
boundary.

Rules:

- [x] `ServerRuntimeLayer` owns the central Effect layer graph.
- [x] `makeRoutesLayer` owns HTTP/WebSocket route layer assembly.
- [x] `ServerRuntime.make(...)` is the only current `ManagedRuntime.make`
      boundary.
- [x] Do not add service-local runtimes or exported async facades on top of
      services.
- [x] Non-Effect entrypoints should use the central runtime boundary or the
      route runtime they are already hosted by.
- [x] If a service needs startup work, put it in the owning layer/startup
      service instead of exporting a `start()` facade from the service module.

## Service Shape

Multi currently uses a split service pattern: a `*.service.ts` file declares the
Context service contract and a sibling `.ts` file implements the live layer.
This is canonical for now; it is not the same smell as app `.logic.ts` files.

Keep a `*.service.ts` file when:

- [ ] The service is yielded by multiple layers, route handlers, tests, or
      adapters.
- [ ] The contract exposes a real Effect dependency boundary.
- [ ] The method signatures carry a typed expected error union.
- [ ] The implementation has live/test/mock layer variants.

Do not add a service file when:

- [ ] A private helper is only used inside one implementation module.
- [ ] The exported type only exists to make a test import private logic.
- [ ] The file wraps a native/library function without domain semantics.
- [ ] A route handler is the only consumer and the logic can stay route-local.

## Route Error Contracts

Route and RPC boundaries translate typed service errors into public contracts.
Domain services stay HTTP/WebSocket agnostic.

Current anchors:

- [x] `packages/server/src/auth/http.ts` maps `AuthError` through
      `respondToAuthError`.
- [x] `packages/server/src/orchestration/http.ts` maps
      `OrchestrationDispatchCommandError` and `OrchestrationGetSnapshotError`
      at the route boundary.
- [x] `packages/server/src/orchestration/http.ts` returns the contract-owned
      `OrchestrationHttpErrorResponse` body; `packages/server/src/cli.ts`
      decodes that same schema.
- [x] `packages/server/src/ws.ts` hosts WebSocket RPC methods from
      `packages/contracts/src/rpc.ts`.
- [x] `packages/server/src/http.ts` attachment route maps route-local
      `AttachmentRequestUrlError`, `AttachmentPathError`,
      `AttachmentNotFoundError`, and `AttachmentServeError` tags to the
      existing public text/status responses.
- [x] `packages/server/src/http.ts` project favicon route maps route-local
      `ProjectFaviconRequestUrlError`, `ProjectFaviconMissingCwdError`, and
      `ProjectFaviconServeError` tags to the existing public text/status
      responses.
- [x] `packages/server/src/http.ts` static/dev route maps route-local
      `StaticRequestUrlError`, `StaticUnavailableError`, `StaticPathError`,
      `StaticNotFoundError`, and `StaticServeError` tags to the existing public
      text/status responses.
- [x] `packages/server/src/http.ts` environment descriptor route has no local
      expected failure branch to translate; the descriptor service is currently
      infallible and the route returns the descriptor contract directly.

Rules:

- [x] Pick one route group at a time and write the public error shape before
      changing code.
- [x] Keep one-off error translations inline with the route.
- [x] Extract a route-group helper only after the same translation repeats.
- [x] Do not add a generic `unknown -> status/message` registry.
- [x] Preserve existing wire bodies unless a breaking contract change is
      explicit.

## Defect Boundary

`Effect.die(...)` is allowed for defects: impossible states, missing platform
APIs, violated invariants, and final unknown-boundary fallbacks. It is not for
user, IO, auth, missing resource, provider process, git, terminal, or validation
failures.

Current classification:

- [x] `packages/server/src/terminal/BunPTY.ts`: converted the Windows
      unavailable guard from a layer-construction defect to a typed
      `PtySpawnError`; spawn/write/resize failures now stay on typed terminal
      boundaries.
- [x] `packages/server/src/provider/ProviderService.ts`: a provider adapter
      emitting events for a different provider than its registered instance is
      an adapter invariant defect.
- [x] `packages/server/src/orchestration/ProviderCommandReactor.ts`: missing
      read-model thread entries while reacting to provider-intent events are
      projection/reactor invariant defects. Expected command failures should use
      orchestration tagged errors before the reactor receives the event.
- [x] `packages/server/src/persistence/NodeSqliteClient.ts`: unsupported
      `node:sqlite` API shape is a startup/runtime prerequisite defect. SQL
      execution and decode failures remain typed persistence errors.

Revisit these only if one becomes reachable from a user-triggered route/action
as an expected failure instead of an impossible runtime condition.

## Server Root Helpers

Root server helpers are not app helper cleanup. Caller inventory decides whether
they are boundaries.

Current caller facts:

- [x] `process-runner.ts` is shared by GitHub CLI, Git core tests,
      repository identity, environment labels, terminal manager, provider
      snapshot, and opencode runtime.
- [x] `attachment-store.ts`, `attachment-paths.ts`, and `image-mime.ts` are
      shared by HTTP attachments, orchestration normalization/projection, Git
      text generation, provider adapters, and tests.
- [x] `path-expansion.ts` is shared by provider, project, and Git text
      generation code.
- [x] `server-lifecycle-events.ts` is a real runtime event boundary used by
      startup, WebSocket subscriptions, server runtime assembly, and tests.
- [x] `startup-access.ts` is shared by auth policy, runtime state, startup, and
      tests.
- [x] `atomic-write.ts` is used by server settings and provider status cache.

Rules:

- [ ] Move a root helper only when there is a clearer owning package/directory
      and all callers follow that ownership.
- [ ] Keep cross-cutting server helpers when collapsing them would duplicate
      adapter logic or hide an important filesystem/process/security rule.
- [ ] Delete only after caller inventory shows no production consumer.

## Observability

Observability duplication is the first concrete server/shared cleanup target.

Rules:

- [x] `@multi/shared/observability` owns trace record formatting, trace sinks,
      local file tracing, and attribute compaction.
- [x] `packages/server/src/observability/Metrics.ts` keeps server-only metric
      instruments and labels.
- [x] `packages/server/src/observability/Observability.ts` keeps server runtime
      assembly.
- [x] `packages/server/src/observability/RpcInstrumentation.ts` keeps server
      RPC span boundaries.
- [x] Delete server duplicate trace files only after imports and focused
      observability tests point at shared.

## First Work Items

- [x] Choose one route group for explicit error contracts. Prefer
      `packages/server/src/orchestration/http.ts` if the goal is tagged route
      mapping, or `packages/server/src/http.ts` if the goal is plain-text
      expected failure cleanup.
- [x] Classify the original five `Effect.die` callsites before editing them;
      the Bun PTY unavailable-platform path has been converted, leaving four
      current defect callsites.
- [x] Make shared observability canonical and remove server duplicate
      trace/sink/tracer files.
- [x] Re-run the runtime facade inventory before any service-shape cleanup:
      `rg -n "ManagedRuntime\.make|makeRuntime\(" packages/server/src packages/shared/src packages/contracts/src --glob '*.ts'`.
- [x] Keep `pnpm run typecheck` as the verifier for code changes.
- [x] Tighten `packages/server/src/http.ts` project favicon and static/dev
      expected failures with route-local tagged errors while preserving existing
      text/status wire responses.
- [x] Tighten terminal write/resize process operation failures with a typed
      public `TerminalError` branch.
- [x] Tighten terminal PTY spawn adapter failures with the existing typed
      `PtySpawnError` service contract.

## Done Means

- [x] No service-local runtime or async facade is introduced.
- [x] Any changed service method exposes expected failures in its Effect error
      type.
- [x] Any changed route maps expected route/service errors at the route/RPC
      boundary.
- [ ] Generic middleware or catch-all translation does not grow new domain
      knowledge.
- [x] Server/shared observability has one canonical trace implementation.
- [x] `pnpm run typecheck` passes after code changes.
