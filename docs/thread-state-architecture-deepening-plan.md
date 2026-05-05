# Thread State Architecture Deepening Plan

Date: 2026-05-05

## Goal

Deepen the modules that own Workspace, Thread, and Checkpoint state so callers get more leverage through smaller interfaces and maintainers get better locality for changes.

This plan is intentionally not a compatibility migration. Retired Project language should be deleted from current interfaces rather than wrapped in a long-lived legacy seam. Persisted storage can be migrated or rewritten as needed, but current code should speak the domain language from `CONTEXT.md`:

- **Workspace** for the user-configured code root.
- **Workspace Root** for the filesystem path attached to a Workspace.
- **Thread** for a durable conversation with an Agent inside a Workspace.
- **Turn** for an internal execution cycle.
- **Checkpoint** for internal saved Workspace state used for Diff and revert mechanics.
- **Changes** for user-facing modifications.
- **Diff** for developer-facing patch comparison mechanics.

## Non-Goals

- Do not preserve legacy Project interfaces.
- Do not add compatibility aliases such as `ProjectId = WorkspaceId`.
- Do not add pass-through adapter modules with one adapter.
- Do not create a timeline module. The product concept is a Thread view made from Messages, Activity, Proposed Plans, and Changes.
- Do not add broad regression tests that freeze the old shape. Add tests for the new module interfaces only.
- Do not rename only types while leaving behaviour spread across old files.

## Current Friction

### Workspace Naming Is Leaking

The domain model has retired Project language, but current orchestration, app state, and persistence still expose Project names:

- `ProjectId`
- `OrchestrationProject`
- `OrchestrationProjectShell`
- `project.create`
- `project.meta.update`
- `project.delete`
- `projectId`
- `ProjectionProjects`
- `getActiveProjectByWorkspaceRoot`
- `threadIdsByProjectId`

This makes every caller learn a contradiction: the product has Workspaces, but the implementation interface says Project. That is a shallow interface because it exports historical naming complexity instead of hiding it.

### Thread State Has Multiple Sources Of Truth

`packages/app/src/store.ts` currently documents that shell stream and detail stream both write Thread state. The comments are necessary because the interface is shallow: callers and maintainers must understand which stream is authoritative for which fields, which writes are additive, and which fields must never be touched by specific stream handlers.

This creates poor locality for bugs around:

- stale sidebar Thread summaries;
- duplicate Messages;
- lost Activity;
- mismatched Session status;
- missing Proposed Plans;
- stale Checkpoint summaries after revert;
- active Thread state diverging from shell state.

### Server Projection Assembly Is Too Broad

`ProjectionPipeline.ts` owns projection writes across many repositories. `ProjectionSnapshotQuery.ts` owns SQL reads, row decoding, aggregate assembly, shell snapshots, detail snapshots, counts, Checkpoint context, and Workspace Root lookup. The module is doing real work, but its interface is broad enough that callers still need to know too much about projection layout.

The deletion test says these modules are earning their keep, but not deeply enough. Deleting them would spread behaviour everywhere, which proves the seam is real. The opportunity is to deepen the seam so callers ask for domain-shaped Thread and Workspace state rather than row-shaped projection state.

### Checkpoint Lifecycle Rules Are Spread Out

Checkpoint capture, Checkpoint summary derivation, missing/error state, revert retention, Diff lookup, and user-facing Changes state span these areas:

- `packages/server/src/orchestration/CheckpointReactor.ts`
- `packages/server/src/checkpointing/*`
- `packages/server/src/orchestration/ProjectionPipeline.ts`
- `packages/server/src/orchestration/ProjectionSnapshotQuery.ts`
- `packages/app/src/store.ts`

The rules for what survives a Checkpoint revert currently require knowledge of Messages, Turns, Proposed Plans, Activity, Checkpoint turn counts, and client state normalization. That is low locality.

## Target Architecture

The target architecture has four deep modules.

### 1. Workspace Module

The Workspace module owns current Workspace identity, metadata, scripts, Workspace Root, repository identity, and Workspace membership for Threads.

#### Interface Responsibilities

The interface should let callers:

- create a Workspace;
- update Workspace metadata;
- delete a Workspace;
- list active Workspaces;
- find a Workspace by Workspace Root;
- read a Workspace shell record;
- attach a Thread to a Workspace;
- list Thread ids for a Workspace.

#### Implementation Responsibilities

The implementation owns:

- storage table naming;
- command/event naming migration;
- schema changes;
- default model selection persistence;
- script persistence;
- repository identity resolution;
- Workspace Root normalization.

#### Deletions

Delete or rename current Project-facing surfaces instead of aliasing them:

- `ProjectId` becomes `WorkspaceId`.
- `OrchestrationProject` becomes `OrchestrationWorkspace`.
- `OrchestrationProjectShell` becomes `OrchestrationWorkspaceShell`.
- `ProjectScript` becomes `WorkspaceScript`.
- `ProjectScriptIcon` becomes `WorkspaceScriptIcon`.
- `project.create` becomes `workspace.create`.
- `project.meta.update` becomes `workspace.meta.update`.
- `project.delete` becomes `workspace.delete`.
- `projectId` fields become `workspaceId`.
- `ProjectionProjects` becomes `ProjectionWorkspaces`.
- `threadIdsByProjectId` becomes `threadIdsByWorkspaceId`.

#### Files To Change

- `packages/contracts/src/base-schemas.ts`
- `packages/contracts/src/orchestration.ts`
- `packages/contracts/src/ipc.ts`
- `packages/server/src/orchestration/decider.ts`
- `packages/server/src/orchestration/projector.ts`
- `packages/server/src/orchestration/OrchestrationEngine.ts`
- `packages/server/src/orchestration/ProjectionPipeline.ts`
- `packages/server/src/orchestration/ProjectionSnapshotQuery.ts`
- `packages/server/src/orchestration/ProjectionSnapshotQuery.service.ts`
- `packages/server/src/persistence/ProjectionProjects.ts`
- `packages/server/src/persistence/ProjectionProjects.service.ts`
- `packages/server/src/persistence/migrations.ts`
- `packages/server/src/project/*`
- `packages/server/src/workspace/*`
- `packages/app/src/store.ts`
- `packages/app/src/types.ts`
- `packages/app/src/project-scripts.ts`
- UI files that render Project language or use Project types.

### 2. Thread Projection Module

The Thread projection module owns the domain-shaped Thread view returned by the server. It should not expose projection table layout to callers.

#### Interface Responsibilities

The interface should let callers:

- read a shell snapshot for the Workbench;
- read one Thread detail snapshot;
- subscribe to shell changes;
- subscribe to one Thread detail stream;
- read counts needed by Environment status;
- read Checkpoint context for a Thread.

The interface should return domain-shaped records:

- Workspaces;
- Thread shells;
- Thread details;
- Messages;
- Activity;
- Proposed Plans;
- Session;
- latest Turn;
- Checkpoint summaries.

#### Implementation Responsibilities

The implementation owns:

- SQL row decoding;
- projection table joins;
- sorting;
- truncation limits;
- repository identity resolution;
- shell/detail shape differences;
- projection catch-up state;
- mapping persisted projection rows into contract schemas.

#### Depth Requirement

Callers must not know:

- which projection table stores each Thread fact;
- how rows are joined;
- which fields are shell-only;
- which fields are detail-only;
- how latest Turn is derived;
- how Proposed Plans are ordered;
- how Activity is ordered;
- how Checkpoint summaries are ordered.

#### Files To Change

- `packages/server/src/orchestration/ProjectionSnapshotQuery.ts`
- `packages/server/src/orchestration/ProjectionSnapshotQuery.service.ts`
- `packages/server/src/orchestration/ProjectionPipeline.ts`
- `packages/server/src/orchestration/http.ts`
- `packages/contracts/src/orchestration.ts`

#### File Shape

Split the current broad `ProjectionSnapshotQuery.ts` into smaller implementation files behind one public module interface:

- `ThreadProjection.ts` for the public module implementation.
- `ThreadProjection.service.ts` for the Effect service tag and shape.
- `ThreadProjectionRows.ts` for SQL row schemas and row mappers.
- `ThreadProjectionAssembly.ts` for assembling Thread shell/detail records.
- `WorkspaceProjectionRows.ts` for Workspace row schemas and mappers.

These are implementation files behind one module seam, not separate caller-facing modules.

### 3. Thread Sync Module

The Thread sync module owns client-side reconciliation between shell snapshots, shell events, Thread detail snapshots, and Thread detail events.

#### Interface Responsibilities

The interface should let callers apply:

- an Environment shell snapshot;
- a shell stream event;
- a Thread detail snapshot;
- a Thread detail stream event;
- Environment bootstrap completion;
- Environment removal.

The interface should return the next client Environment state.

#### Implementation Responsibilities

The implementation owns:

- source-of-truth rules between shell and detail streams;
- structural equality checks;
- normalized Message storage;
- normalized Activity storage;
- normalized Proposed Plan storage;
- normalized Checkpoint summary storage;
- Thread deletion cleanup;
- Workspace deletion cleanup;
- Thread registration bookkeeping;
- retention after Checkpoint revert;
- limits for Messages, Activity, Proposed Plans, and Checkpoints.

#### Depth Requirement

UI callers must not know:

- whether a value came from shell stream or detail stream;
- whether shell is authoritative for sidebar state;
- whether detail writes are additive;
- how duplicate stream events are reconciled;
- how revert prunes Thread state;
- which maps and id arrays must be updated together.

#### Files To Change

- `packages/app/src/store.ts`
- `packages/app/src/thread-derivation.ts`
- `packages/app/src/types.ts`

#### File Shape

Create a dedicated client sync implementation:

- `packages/app/src/thread-sync.ts`
- `packages/app/src/thread-sync.test.ts`
- `packages/app/src/thread-state.ts`

Move these out of `store.ts`:

- contract-to-client mapping;
- shell snapshot application;
- shell event application;
- detail snapshot application;
- detail event application;
- Thread deletion cleanup;
- Workspace deletion cleanup;
- Checkpoint revert retention;
- equality helpers used only by sync.

Keep `store.ts` responsible for Zustand wiring only:

- initial state;
- public actions;
- calling Thread sync functions;
- selectors that need store access.

### 4. Checkpoint Lifecycle Module

The Checkpoint lifecycle module owns how Turns produce Checkpoints and how Checkpoint reverts affect Thread facts.

#### Interface Responsibilities

The interface should let callers:

- capture a pre-Turn Checkpoint;
- capture a post-Turn Checkpoint;
- derive a Checkpoint summary;
- request a Checkpoint revert;
- derive retained Thread facts after revert;
- append Activity for Checkpoint capture/revert failures.

#### Implementation Responsibilities

The implementation owns:

- Checkpoint ref naming;
- Workspace Root vs Worktree path selection;
- Git ref existence checks;
- Diff summary generation;
- Checkpoint turn count rules;
- missing/error Checkpoint status;
- revert retention rules for Messages, Activity, Proposed Plans, Turns, and Checkpoint summaries;
- failure Activity payloads.

#### Depth Requirement

Callers must not know:

- how Checkpoint refs are named;
- how turn counts map to Checkpoint refs;
- which Thread facts survive a revert;
- when a missing Checkpoint should or should not overwrite a ready Checkpoint;
- how capture failure Activity is shaped;
- how Diff summary files are derived.

#### Files To Change

- `packages/server/src/orchestration/CheckpointReactor.ts`
- `packages/server/src/checkpointing/CheckpointStore.ts`
- `packages/server/src/checkpointing/CheckpointDiffQuery.ts`
- `packages/server/src/checkpointing/Utils.ts`
- `packages/server/src/orchestration/ProjectionPipeline.ts`
- `packages/server/src/orchestration/ProjectionSnapshotQuery.ts`
- `packages/app/src/thread-sync.ts`

#### File Shape

Create a deeper module around Checkpoint lifecycle:

- `packages/server/src/checkpointing/CheckpointLifecycle.ts`
- `packages/server/src/checkpointing/CheckpointLifecycle.service.ts`
- `packages/server/src/checkpointing/CheckpointRetention.ts`

`CheckpointReactor.ts` should become orchestration wiring, not lifecycle logic.

## Detailed Execution Plan

### Phase 1: Rename Project To Workspace At Current Interfaces

#### Step 1.1: Rename Contract Schemas

In `packages/contracts/src/base-schemas.ts`:

- Replace `ProjectId` with `WorkspaceId`.
- Delete `ProjectId` export.

In `packages/contracts/src/orchestration.ts`:

- Rename `ProjectScriptIcon` to `WorkspaceScriptIcon`.
- Rename `ProjectScript` to `WorkspaceScript`.
- Rename `OrchestrationProject` to `OrchestrationWorkspace`.
- Rename `OrchestrationProjectShell` to `OrchestrationWorkspaceShell`.
- Rename every `projectId` field to `workspaceId`.
- Rename command schemas from Project to Workspace.
- Rename event schemas from Project to Workspace.
- Rename shell snapshot `projects` to `workspaces`.
- Rename read model `projects` to `workspaces`.
- Rename shell stream event payloads from `project` to `workspace`.

Expected new command names:

- `workspace.create`
- `workspace.meta.update`
- `workspace.delete`

Expected new event names:

- `workspace.created`
- `workspace.meta-updated`
- `workspace.deleted`

#### Step 1.2: Rename Server Orchestration References

Update:

- command aggregate routing in `OrchestrationEngine.ts`;
- command handling in `decider.ts`;
- read model projection in `projector.ts`;
- command invariants in `command-invariants.ts`;
- orchestration HTTP/RPC handlers;
- orchestration tests.

The aggregate kind should become `workspace` instead of `project`.

#### Step 1.3: Rename Persistence Projection Tables And Repositories

Change repository module names:

- `ProjectionProjects.ts` to `ProjectionWorkspaces.ts`.
- `ProjectionProjects.service.ts` to `ProjectionWorkspaces.service.ts`.

Change projection table names in migrations:

- `projection_projects` to `projection_workspaces`.

Change column names:

- `project_id` to `workspace_id`.

Because this plan does not preserve legacy interfaces, update migrations and fixtures to the new names. If existing local databases are not required, delete migration code that only exists to preserve old Project projections.

#### Step 1.4: Rename Client State

In `packages/app/src/store.ts` and related files:

- `projectIds` becomes `workspaceIds`.
- `projectById` becomes `workspaceById`.
- `threadIdsByProjectId` becomes `threadIdsByWorkspaceId`.
- `Project` type becomes `Workspace`.
- `projectId` fields become `workspaceId`.
- `mapProject` becomes `mapWorkspace`.
- project script helpers become workspace script helpers.

#### Step 1.5: Delete Old Project Files

Delete files that only exist for Project naming after replacements are in place:

- old projection repository files;
- old app project helper files;
- old tests named around Project after equivalent Workspace tests exist.

Do not leave forwarding files.

### Phase 2: Extract Thread Projection Module

#### Step 2.1: Define The Thread Projection Interface

Create `packages/server/src/orchestration/ThreadProjection.service.ts` with methods for:

- `getShellSnapshot`
- `getThreadDetailById`
- `getWorkspaceShellById`
- `getFirstActiveThreadIdByWorkspaceId`
- `getThreadCheckpointContext`
- `getCounts`

Use Workspace language in every method and type.

#### Step 2.2: Move SQL Row Schemas

Move row schemas out of `ProjectionSnapshotQuery.ts` into implementation-only files:

- Workspace rows;
- Thread rows;
- Message rows;
- Activity rows;
- Proposed Plan rows;
- Session rows;
- latest Turn rows;
- Checkpoint rows;
- projection state rows.

Keep row schema names private to the implementation seam.

#### Step 2.3: Move Assembly Logic

Move assembly logic into `ThreadProjectionAssembly.ts`:

- group Messages by Thread;
- group Activity by Thread;
- group Proposed Plans by Thread;
- group Checkpoints by Thread;
- map latest Turn rows;
- map Session rows;
- assemble Thread shell records;
- assemble Thread detail records;
- assemble shell snapshots.

#### Step 2.4: Keep Projection Writes Separate

Keep `ProjectionPipeline.ts` focused on applying events to projection tables. It should not assemble Thread detail records for callers.

#### Step 2.5: Replace ProjectionSnapshotQuery Callers

Replace callers of `ProjectionSnapshotQuery` with `ThreadProjection` where the caller needs domain-shaped Thread or Workspace state.

If any remaining call needs raw projection state, keep it internal to the projection implementation or rename it to reflect the lower-level role.

### Phase 3: Extract Thread Sync Module

#### Step 3.1: Create Client Thread State Types

Create `packages/app/src/thread-state.ts` for normalized state types:

- `EnvironmentState`
- `WorkspaceState` or `Workspace`
- `ThreadShell`
- `ThreadSession`
- `ThreadTurnState`
- normalized Message maps;
- normalized Activity maps;
- normalized Proposed Plan maps;
- normalized Checkpoint maps.

Remove these definitions from `store.ts` once imports are in place.

#### Step 3.2: Create Sync Functions

Create `packages/app/src/thread-sync.ts` with pure functions:

- `applyShellSnapshot`
- `applyShellEvent`
- `applyThreadDetailSnapshot`
- `applyThreadDetailEvent`
- `removeWorkspace`
- `removeThread`
- `markBootstrapComplete`

Each function takes current state and input, then returns next state.

#### Step 3.3: Move Mapping Functions

Move these from `store.ts` into Thread sync implementation:

- Workspace mapper;
- Thread mapper;
- Thread shell mapper;
- Session mapper;
- Message mapper;
- Proposed Plan mapper;
- Checkpoint summary mapper;
- latest Turn mapper;
- sidebar summary mapper.

#### Step 3.4: Move Reconciliation Rules

Move all shell/detail source-of-truth logic into Thread sync:

- shell stream owns sidebar summaries;
- detail stream owns Messages;
- detail stream owns Activity;
- detail stream owns Proposed Plans;
- detail stream owns Checkpoint detail summaries;
- shell and detail both may update Thread shell/session/latest Turn only through one reconciliation function.

Remove explanatory comments from `store.ts` once the rules live behind the Thread sync interface.

#### Step 3.5: Move Retention Rules

Move client-side Checkpoint revert retention into Thread sync temporarily, then delegate to Checkpoint lifecycle result once server shape supports it.

The retained facts are:

- Messages with retained Turns;
- system Messages;
- Activity with retained Turns or no Turn;
- Proposed Plans with retained Turns or no Turn;
- Checkpoint summaries at or before reverted turn count;
- latest Turn derived from retained Checkpoint status.

### Phase 4: Deepen Checkpoint Lifecycle

#### Step 4.1: Create Checkpoint Lifecycle Interface

Create `packages/server/src/checkpointing/CheckpointLifecycle.service.ts` with methods for:

- capture pre-Turn baseline;
- capture post-Turn Checkpoint;
- summarize Checkpoint Changes;
- revert to Checkpoint;
- derive retained Thread facts after revert;
- create failure Activity.

#### Step 4.2: Move Checkpoint Naming And Counting

Move all Checkpoint ref and turn count logic into Checkpoint lifecycle:

- `checkpointRefForThreadTurn`;
- baseline Checkpoint count rules;
- post-Turn Checkpoint count rules;
- turn count to Checkpoint ref mapping.

#### Step 4.3: Move Capture Logic

Move from `CheckpointReactor.ts` into Checkpoint lifecycle:

- resolving Workspace Root vs Worktree path;
- checking Git repository state;
- capturing Git refs;
- deriving file Changes;
- handling missing refs;
- producing ready/missing/error summaries.

`CheckpointReactor.ts` should only subscribe to orchestration events and call lifecycle methods.

#### Step 4.4: Move Revert Retention To Server

The server should emit or project enough information after `thread.checkpoint-revert-requested` that the client does not need to independently reconstruct revert retention rules.

The Checkpoint lifecycle module should own retained facts and project the resulting Thread state.

#### Step 4.5: Simplify Client Revert Handling

After server retention is authoritative, client Thread sync should apply the server detail/shell event result. It should not independently decide which Messages, Activity, Proposed Plans, or Checkpoints survive.

### Phase 5: Delete Old Shallow Modules And Comments

Delete or rewrite modules whose only job became pass-through after the deep modules exist.

Candidates:

- old Project projection files;
- old Project script helpers;
- `ProjectionSnapshotQuery` if fully replaced by `ThreadProjection`;
- Checkpoint utility functions that only forward to Checkpoint lifecycle;
- large explanatory source-of-truth comments in `store.ts` after Thread sync owns the rules.

A module passes the deletion test only if deleting it would force meaningful complexity into callers. If deleting it just removes forwarding, delete it.

## Testing Plan

Tests should target the new module interfaces. Do not write tests that preserve old Project naming or old store internals.

### Workspace Tests

Add or update tests that verify:

- Workspace create/update/delete commands produce Workspace events;
- Threads attach to Workspaces by `workspaceId`;
- Workspace Root lookup returns the active Workspace;
- shell snapshots return Workspaces, not Projects;
- deleted Workspaces disappear from active shell snapshots.

### Thread Projection Tests

Add tests around `ThreadProjection`:

- shell snapshot assembly;
- Thread detail assembly;
- latest Turn derivation;
- Message ordering;
- Activity ordering;
- Proposed Plan ordering;
- Checkpoint summary ordering;
- projection state sequence calculation;
- missing projector state behaviour.

### Thread Sync Tests

Add tests around pure Thread sync functions:

- shell snapshot bootstraps Environment state;
- shell event updates Thread shell state without touching detail content;
- Thread detail snapshot populates Messages, Activity, Proposed Plans, and Checkpoints;
- duplicate shell/detail events are idempotent;
- Thread deletion removes all Thread-scoped records;
- Workspace deletion removes Workspace and owned Threads;
- bootstrap completion is isolated per Environment.

### Checkpoint Lifecycle Tests

Add tests around Checkpoint lifecycle:

- pre-Turn baseline capture;
- post-Turn Checkpoint capture;
- missing Checkpoint handling;
- capture failure Activity;
- Diff summary derivation;
- revert retention rules;
- ready Checkpoint is not overwritten by stale missing status;
- Worktree path is preferred when Thread runs in a Worktree.

## Verification Commands

After code changes:

```bash
bun run typecheck
```

When creating or modifying a specific test file, run that file from its package root with:

```bash
bunx vitest --run path/to/test-file.test.ts
```

Do not run broad test or build commands unless explicitly requested.

## Implementation Order

1. Rename Workspace contracts and fix type errors at the contracts seam.
2. Rename server orchestration command/event/read-model handling.
3. Rename projection persistence from Project to Workspace.
4. Rename client app state from Project to Workspace.
5. Extract Thread projection behind a deeper server interface.
6. Extract Thread sync behind pure client functions.
7. Extract Checkpoint lifecycle behind a server interface.
8. Delete old pass-through files and comments.
9. Add focused tests for the new module interfaces.
10. Run typecheck and targeted tests.

## Success Criteria

- Current interfaces use Workspace language throughout.
- No Project compatibility aliases remain.
- Thread state reconciliation no longer lives directly in the Zustand store.
- Server callers ask for domain-shaped Thread and Workspace state, not projection rows.
- Checkpoint lifecycle rules are local to the Checkpoint lifecycle module.
- Client code no longer independently reconstructs server-owned Checkpoint revert rules.
- Tests exercise Workspace, Thread projection, Thread sync, and Checkpoint lifecycle through their module interfaces.
- Deleting any remaining module would either remove real complexity or prove the module is shallow enough to delete.
