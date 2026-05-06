---
name: Git panel orchestration refresh
overview: Close the client reactivity gap by refreshing Git status after orchestration applies `thread.activity-appended` events for disk-mutating tool activity (`file_change`, optionally `command_execution`), using the same `refreshGitStatus` path as the manual panel refresh.
todos:
  - id: extend-batch-effects
    content: Add gitRefreshThreadIds + thread.activity-appended heuristics to orchestration-event-effects.ts
    status: completed
  - id: wire-service-refresh
    content: After applyOrchestrationEvents in applyRecoveredEventBatch, resolve cwd per thread and call refreshGitStatus
    status: completed
  - id: tests-batch-effects
    content: Cover new git refresh derivation in orchestration-event-effects.test.ts
    status: completed
isProject: false
---

# Git panel self-refresh after orchestration file activity

## Problem (confirmed)

- [`packages/app/src/environments/runtime/service.ts`](packages/app/src/environments/runtime/service.ts): `applyRecoveredEventBatch` calls `useStore.getState().applyOrchestrationEvents(uiEvents, environmentId)` but never invalidates Git state.
- Live thread stream handlers call `applyEnvironmentThreadDetailEvent` ([`service.ts` ~L277–285](packages/app/src/environments/runtime/service.ts)), which always forwards a one-event batch to `applyRecoveredEventBatch` ([`service.ts` ~L683–687](packages/app/src/environments/runtime/service.ts)) — **this is the correct single choke point** for subscribed detail events.
- [`packages/app/src/lib/git-status-state.ts`](packages/app/src/lib/git-status-state.ts): `refreshGitStatus` is the right API (uses RPC `refreshStatus`, which feeds `onStatus` and updates the atom the Git panel already watches via `useGitStatus` in [`use-environment-git.ts`](packages/app/src/hooks/use-environment-git.ts)).

## Activity shape (confirmed)

- [`OrchestrationThreadActivity`](packages/contracts/src/orchestration.ts) uses `payload: Schema.Unknown`; runtime tool rows include `payload.itemType` (e.g. `file_change`, `command_execution`) from [`ProviderRuntimeIngestion.runtimeEventToActivities`](packages/server/src/orchestration/ProviderRuntimeIngestion.ts) for `item.started` / `item.updated` / `item.completed` and streaming `content.delta` rows.
- **Do not** trigger on `tool.started` alone (no durable edit yet). Prefer **`tool.updated` and `tool.completed`** (and skip `tool.started`) so streaming file changes still move the panel without waiting only for completion if the provider is slow to emit `item.completed`.

## Implementation

### 1. Extend batch effect derivation

In [`packages/app/src/orchestration-event-effects.ts`](packages/app/src/orchestration-event-effects.ts):

- Add `gitRefreshThreadIds: ThreadId[]` (deduped) to `OrchestrationBatchEffects`.
- In the event loop, on `thread.activity-appended`:
  - Read `itemType` from `event.payload.activity.payload` with a small type guard (`typeof payload === "object" && payload !== null && "itemType" in payload && typeof itemType === "string"`).
  - If `itemType === "file_change"` (required): push `event.payload.threadId` when `activity.kind` is `tool.updated` or `tool.completed` (not `tool.started`).
  - **Optional (product choice):** also treat `itemType === "command_execution"` with the same kind filter for shell-driven edits; this is noisier (many commands do not touch tracked files) but matches your investigation. **Recommendation:** ship `file_change` only first; add `command_execution` behind a one-line allowlist or constant if you want instant shell-edit UX without server-side classification.

Keep this file free of `refreshGitStatus` / React / Zustand imports so tests stay pure.

### 2. Wire refresh after store apply

In [`packages/app/src/environments/runtime/service.ts`](packages/app/src/environments/runtime/service.ts), **after** `useStore.getState().applyOrchestrationEvents(uiEvents, environmentId)` ([~L641](packages/app/src/environments/runtime/service.ts)):

- Read `batchEffects.gitRefreshThreadIds` from the already-computed `deriveOrchestrationBatchEffects(events)` (use **raw `events`**, not only `uiEvents`, so nothing is missed; coalescing only merges consecutive `thread.message-sent`).
- For each thread id (dedupe `(environmentId, cwd)`):
  - `const state = useStore.getState()`
  - `const thread = selectThreadByRef(state, scopeThreadRef(environmentId, threadId))`
  - If `thread?.projectId == null`, skip
  - `const project = selectProjectByRef(state, scopeProjectRef(environmentId, thread.projectId))`
  - `const cwd = thread.worktreePath ?? project?.cwd ?? null` (same resolution pattern as [`use-shell-cwd.ts` / shell-host`](packages/app/src/hooks/use-shell-cwd.ts))
  - `void refreshGitStatus({ environmentId, cwd })` from [`packages/app/src/lib/git-status-state.ts`](packages/app/src/lib/git-status-state.ts)

**Module graph:** The repo already has a `store → thread-sync → environments/runtime → service → store` cycle via `resolveEnvironmentHttpUrl`; adding `service → git-status-state → environments/runtime` is the same hub. If typecheck surfaces init issues, fallback is to call `readEnvironmentConnection(environmentId)?.client.git.refreshStatus({ cwd })` and rely on `onStatus` (duplicates refresh path) — unlikely to be needed.

### 3. Tests

- Extend [`packages/app/src/orchestration-event-effects.test.ts`](packages/app/src/orchestration-event-effects.test.ts): cases for `thread.activity-appended` with `file_change` + `tool.completed` / `tool.updated` (expect id in `gitRefreshThreadIds`), `tool.started` (expect not), non–`file_change` item types (expect not), batch dedupe.

### 4. Caveat (existing behavior)

[`GIT_STATUS_REFRESH_DEBOUNCE_MS` (1s)](packages/app/src/lib/git-status-state.ts) can skip rapid consecutive `refreshGitStatus` calls; orchestration may emit many `tool.updated` rows during streaming. Accept for v1, or follow up with debounce+trailing flush if QA shows stale final state.

## What we are not changing

- [`packages/app/src/components/shell/git/panel.tsx`](packages/app/src/components/shell/git/panel.tsx): presentational; no change required.
- Provider / server: already emits the events; fix is client-only.
