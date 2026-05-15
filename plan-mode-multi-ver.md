# Plan Mode Workbench Implementation Plan

This document is the Multi-specific implementation instruction for turning plan
mode output and runtime task steps into a canonical right workbench surface.

It builds on `plan-mode.md`, but narrows the direction to this repository's
actual contracts and code paths.

## Goal

Implement a contextual `Plan` / `Tasks` right workbench tab for desktop chat.
The tab must combine:

1. Proposed plan markdown produced by Plan Mode.
2. Runtime task/checklist steps produced by `update_plan`-style progress events.

The implementation must not depend on a new plan-finalization toolcall. Codex
Plan Mode is passed through the harness as plan item events, and Multi already
maps those events into canonical provider runtime events.

## Complete Scope

The canonical workbench migration is complete only when all of these are true:

- The Plan/Tasks tab is visible for an active thread that has either a proposed
  plan or runtime todo/progress state.
- The tab is hidden for active threads with neither a proposed plan nor runtime
  todo/progress state.
- Proposed plan markdown loads from `Thread.proposedPlans`, renders in the
  workbench, and keeps copy/download/save-to-project actions.
- Runtime todos load from historical `turn.plan.updated` activities when a
  thread is opened or reloaded.
- Runtime todos update live as new `turn.plan.updated` activities arrive.
- Plan markdown and runtime todos render together when both exist for the same
  thread.
- The composer opens the Plan/Tasks workbench tab instead of toggling a local
  chat sidebar.
- The old chat-column `PlanSidebar` surface is removed from `ChatView`.
- The panel follows the existing right workbench/Git panel chrome, sizing, and
  scroll-containment patterns.
- No React component parses raw `<proposed_plan>` text.
- No new plan-finalization toolcall is required for Codex.

Editing is not part of this completion boundary because the current
orchestration API does not expose a dispatchable client command for editing
proposed plan markdown, and runtime todos are provider event history rather than
a user-owned task model. The editing implementation path is still specified
below as a follow-up phase so it is not an undefined gap.

## Current Repo Facts

### Plan Mode Final Output

Codex Plan Mode instructions live in:

- `packages/server/src/provider/CodexDeveloperInstructions.ts`

Those instructions tell the model to finalize with a `<proposed_plan>` block.
The UI should not parse those tags directly. The canonical path is provider
runtime events:

- `turn.proposed.delta`
- `turn.proposed.completed`

Codex adapter support already exists in:

- `packages/server/src/provider/CodexAdapter.ts`

The relevant mappings are:

- `item/plan/delta` -> `turn.proposed.delta`
- completed item with canonical item type `plan` -> `turn.proposed.completed`

The provider runtime schema for those events lives in:

- `packages/contracts/src/provider-runtime.ts`

Provider runtime ingestion buffers plan deltas and upserts completed markdown as
a thread proposed plan in:

- `packages/server/src/orchestration/ProviderRuntimeIngestion.ts`

The persisted/read model object is:

- `OrchestrationProposedPlan`
- fields: `id`, `turnId`, `planMarkdown`, `implementedAt`,
  `implementationThreadId`, `createdAt`, `updatedAt`

That contract lives in:

- `packages/contracts/src/orchestration.ts`

### Runtime Task/Checklist Steps

The runtime checklist source is:

- `turn.plan.updated`

Codex maps harness `turn/plan/updated` notifications to this canonical event in:

- `packages/server/src/provider/CodexAdapter.ts`

The app derives display state from these events with:

- `deriveActivePlanState` in `packages/app/src/session-logic.ts`

This derived state returns:

- `createdAt`
- `turnId`
- optional `explanation`
- ordered `steps`
- step statuses: `pending`, `inProgress`, `completed`

Generic task lifecycle events also exist:

- `task.started`
- `task.progress`
- `task.completed`

Those are currently work log events. Do not make them the primary source for
the Plan/Tasks checklist. The checklist source is `turn.plan.updated`. Generic
task events can be considered for a later "Background tasks" section, but they
are not required for this plan surface.

### Current UI Surface

The current local sidebar is:

- `packages/app/src/components/plan-sidebar.tsx`

It is rendered by:

- `packages/app/src/components/chat/view/chat-view.tsx`

`ChatView` currently owns local sidebar state:

- `planSidebarOpen`
- `planSidebarDismissedForTurnRef`
- `planSidebarOpenOnNextThreadRef`

The composer exposes a toggle through:

- `packages/app/src/components/chat/composer/chat-composer.tsx`
- `packages/app/src/components/chat/composer/compact-composer-controls-menu.tsx`

The current proposed-plan selector helpers are in:

- `packages/app/src/session-logic.ts`

Relevant helpers:

- `deriveActivePlanState`
- `findSidebarProposedPlan`
- `findLatestProposedPlan`
- `hasActionableProposedPlan`

`ChatView` also has a local `useThreadPlanCatalog` selector that must be moved
out before shell-level UI can reuse it.

### Current Right Workbench

The existing right workbench is in:

- `packages/app/src/components/shell/shell/app.tsx`
- `packages/app/src/components/shell/shell/right-workbench-header.tsx`
- `packages/app/src/components/shell/shell/right-workbench-layout.tsx`
- `packages/app/src/components/shell/shell/workbench-panel.tsx`
- `packages/app/src/stores/shell-panels-store.ts`

Current workbench tabs:

- `git`
- `terminal`
- `files`

Current persisted store key:

- `multi.shell.panels.v3`

Current persisted state includes:

- `rightOpen`
- `rightW`
- `activeTab`
- `muted`

The Git panel is the design reference:

- `packages/app/src/components/shell/git/panel.tsx`

Use its pattern:

- shell-level tab chrome
- a panel sub-chrome row via `WorkbenchChromeRow`
- compact icon/text actions through `WorkbenchIconButton` and
  `WorkbenchTextButton`
- full-height scroll containment inside the workbench panel
- no fixed chat-column sidebar width

## Product Decisions

### One Tab Id

Use one stable tab id:

```ts
type WorkbenchTab = "plan" | "git" | "terminal" | "files";
```

The tab label is dynamic:

- `Plan` when a proposed plan exists or the thread interaction mode is `plan`
- `Tasks` when only runtime checklist steps exist

Use `IconSquareChecklist` from `central-icons`.

### Tab Visibility

Show the tab only when the current thread has plan work:

- `deriveActivePlanState(...) !== null`, or
- `findSidebarProposedPlan(...) !== null`

Do not render an empty Plan/Tasks tab.

### Combined Rendering

When both sources exist, render both in one workbench surface:

1. Runtime task/checklist section from `turn.plan.updated`
2. Proposed plan markdown section from `OrchestrationProposedPlan.planMarkdown`

This matches the conceptual model: tasks are the structured progress surface,
and proposed plan markdown is the durable plan body.

### Editing Boundary

Do not implement editing as part of the canonical workbench migration.

Reason: proposed plan upsert is currently an internal orchestration command,
not a dispatchable client command. Runtime checklist steps are event history
from provider runtime events, not a user-owned editable model.

Phase 2 may add editing by introducing an explicit client command such as:

```ts
type ThreadProposedPlanEditCommand = {
  type: "thread.proposed-plan.edit";
  commandId: CommandId;
  threadId: ThreadId;
  proposedPlanId: OrchestrationProposedPlanId;
  planMarkdown: string;
  createdAt: IsoDateTime;
};
```

That command should update the same projected proposed plan row while preserving
`implementedAt` and `implementationThreadId`.

Do not make runtime checklist rows editable until there is a separate durable
task model. Editing emitted `turn.plan.updated` history would mix user edits
with provider event history.

### No New Plan Toolcall

Do not add a React path that waits for an `ExitPlanMode` toolcall for Codex.
Do not add a new "create plan" tool just to make this surface work.

Canonical provider flow:

```text
Codex harness plan item
  -> CodexAdapter
  -> turn.proposed.delta / turn.proposed.completed
  -> ProviderRuntimeIngestion
  -> thread.proposed-plan.upsert
  -> projected Thread.proposedPlans
  -> Plan/Tasks workbench tab
```

Claude can keep its adapter-specific `ExitPlanMode` capture path, but both
providers must converge on `turn.proposed.completed`.

If integration testing proves the harness sends raw assistant text with
`<proposed_plan>` tags instead of plan item events, add the fallback in
`CodexAdapter.ts`. Do not parse the tags in React components.

## Minimal App State

Do not introduce a new plan domain model for the first pass. Compute the
workbench state from the active thread using the helpers that already exist.

Move only the reusable proposed-plan catalog selector out of `chat-view.tsx`.

Suggested file:

- `packages/app/src/lib/thread-plan-catalog.ts`

The moved hook should keep the existing memoized selector behavior.

Then derive these values in `ChatShellHost` or `DesktopChatShellHost`:

```ts
const activePlan = deriveActivePlanState(
  activeThread?.activities ?? [],
  activeThread?.latestTurn?.turnId ?? undefined,
);

const activeProposedPlan = findSidebarProposedPlan({
  threads: threadPlanCatalog,
  latestTurn: activeThread?.latestTurn ?? null,
  latestTurnSettled,
  threadId: activeThread?.id ?? null,
});

const planAvailable = activePlan !== null || activeProposedPlan !== null;
const planLabel = activeProposedPlan || interactionMode === "plan" ? "Plan" : "Tasks";
```

Rules:

- `activePlan` comes from `deriveActivePlanState`.
- `activeProposedPlan` comes from `findSidebarProposedPlan`.
- `planAvailable` controls whether the workbench tab exists.
- `planLabel` controls the visible tab label and composer copy.
- No `planKey`, no dismissal registry, no separate plan workbench state file in
  the first pass.

## Workbench Store Changes

Update:

- `packages/app/src/stores/shell-panels-store.ts`

Add:

```ts
export type WorkbenchTab = "plan" | "git" | "terminal" | "files";
```

Rules:

- `setActiveTab("plan")` sets `activeTab` to `plan` and opens the right
  workbench.
- Non-plan tabs keep their existing behavior.
- If persisted `activeTab` is missing or invalid, default to `files`.
- Secondary rail state can keep accepting `WorkbenchTab`; the plan tab does not
  need a secondary rail in the first pass.
- Keep the existing storage key unless a typecheck or migration concern forces a
  version bump. Adding a new string value is not enough reason to churn local
  panel persistence.

Add selectors/actions:

```ts
export const shellPanelsActions = {
  // existing actions...
  activatePlanTab: () => void;
};
```

`activatePlanTab` should set active tab to `plan`, open the right workbench, and
clear `muted`.

## Contextual Tab Fallback

Update:

- `packages/app/src/components/shell/shell/app.tsx`

The plan tab is contextual: visible when the active thread has a plan or task
state, hidden otherwise.

Use a visible-tab list:

```ts
const visibleTabs: WorkbenchTab[] = planAvailable
  ? ["plan", "git", "terminal", "files"]
  : ["git", "terminal", "files"];

const effectiveActiveTab = visibleTabs.includes(activeTab) ? activeTab : "git";
```

Use `effectiveActiveTab` for:

- `TabsRoot.value`
- active panel visibility
- header active metadata
- route search synchronization

Do not persist a `lastNonPlanTab` in the first pass. If `activeTab === "plan"`
and the next thread has no plan data, the UI simply renders `git` as the
effective tab. The stored tab can remain `plan`; when a later thread has plan
data, the tab is visible again.

If route search contains `workbench=plan` but the current thread has no plan
data, render `git`. Do not render an empty plan panel.

## Workbench Header Changes

Update:

- `packages/app/src/components/shell/shell/right-workbench-header.tsx`

Replace static tab metadata with caller-provided visible metadata.

Suggested shape:

```ts
export interface WorkbenchTabMeta {
  id: WorkbenchTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string | null;
}
```

`RightWorkbenchHeader` props should include:

```ts
tabs: readonly WorkbenchTabMeta[];
activeTab: WorkbenchTab;
```

The tab order must be:

- with plan available: `plan`, `git`, `terminal`, `files`
- without plan available: `git`, `terminal`, `files`

For `plan`, use:

- `label`: `planLabel`
- `icon`: `IconSquareChecklist`

The Git badge stays on the `git` tab.

## Route Search Changes

Update:

- `packages/app/src/diff-route-search.ts`

Accept `plan` as a valid `workbench` search value:

```ts
if (w === "plan" || w === "files" || w === "git" || w === "terminal") {
  return { workbench: w };
}
```

The route already retains `workbench`, so no route middleware change is needed
for server chat routes.

## Plan Workbench Panel

Create:

- `packages/app/src/components/shell/plan/plan-workbench-panel.tsx`

This should replace `PlanSidebar` as the canonical surface.

Props:

```ts
interface PlanWorkbenchPanelProps {
  activePlan: ActivePlanState | null;
  activeProposedPlan: LatestProposedPlanState | null;
  label: "Plan" | "Tasks";
  environmentId: EnvironmentId;
  markdownCwd: string | undefined;
  projectRoot: string | undefined;
  timestampFormat: TimestampFormat;
}
```

Do not include `onClose`. The right workbench chrome already owns close/collapse.

Panel structure:

```tsx
<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
  <WorkbenchChromeRow variant="panel" ...>
    header content and action menu
  </WorkbenchChromeRow>
  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto ...">
    sections
  </div>
</div>
```

Use `WorkbenchChromeRow`, `WorkbenchIconButton`, `WorkbenchTextButton`, and
`MenuPopup variant="workbench"` so the panel matches the Git workbench design.

Do not use:

- fixed `w-[340px]`
- local close button
- chat-column `border-l`
- large rounded cards inside the workbench panel

### Header Content

Show:

- `Plan` or `Tasks` badge/text
- timestamp from `activePlan.createdAt` or `activeProposedPlan.updatedAt`
- actions menu when proposed markdown exists

Actions to preserve from current UI:

- copy plan markdown
- download markdown
- save to project

Keep save-to-project behavior read-only in first pass:

- use `projects.writeFile`
- default filename from `buildProposedPlanMarkdownFilename`
- contents from `normalizePlanMarkdownForExport`

### Task Section

Render when `activePlan` exists and has steps.

This section is required, not optional polish. `Tasks` means the Todo/progress
surface from `turn.plan.updated` is present and loaded for the active thread.

Use the existing icon semantics from `PlanSidebar`:

- completed: checkmark
- in progress: loader
- pending: small dot

Use stable keys. Prefer a key including index plus step text instead of
`status:step`, because status changes should not remount the row:

```ts
key={`${index}:${step.step}`}
```

If `activePlan.explanation` exists, render it above the list.

### Task Loading Contract

The task section must work on initial thread load and during live progress.

Rules:

- Read from `activeThread.activities`, not local component state.
- Derive with `deriveActivePlanState(activeThread.activities, latestTurnId)`.
- Preserve the helper's current fallback behavior: prefer the latest turn's
  plan, then fall back to the most recent prior `turn.plan.updated` so TodoWrite
  state remains visible across follow-up turns.
- Recompute from store updates so streamed `turn.plan.updated` events update
  row statuses live.
- Keep completed/in-progress/pending statuses exactly as emitted by the
  canonical provider runtime event.
- Do not hide the tab while thread detail is still loading if already-known
  thread data contains a plan. If there is no loaded plan data yet, hide the tab
  until activities or proposed plans arrive.
- Do not derive the checklist from `task.started`, `task.progress`, or
  `task.completed`; those lifecycle events remain timeline/work-log entries.

Acceptance examples:

- A reloaded thread with only historical `turn.plan.updated` activities shows
  `Tasks` without waiting for a new stream event.
- A running turn that updates a todo from `pending` to `inProgress` updates the
  existing row in place.
- A follow-up turn with no new todo update keeps showing the most recent prior
  checklist.

### Proposed Plan Section

Render when `activeProposedPlan.planMarkdown` exists.

Use:

- `proposedPlanTitle`
- `stripDisplayedPlanMarkdown`
- `ChatMarkdown`

Unlike the current sidebar, default to showing the markdown body in the
workbench. The workbench owns vertical scrolling, so an extra accordion is not
needed for the first pass.

If later UX needs collapsing, collapse only the markdown section and keep the
section header visible.

## Shell Integration

Update:

- `packages/app/src/components/shell-host.tsx`

`ChatShellHost` already has enough thread/project context to derive plan
workbench state at shell level:

- `activeThread`
- `routeThreadId`
- `projects`
- `settings`
- `activeCwd`
- `activeEnvironmentId`

Add plan derivation in `ChatShellHost` or `DesktopChatShellHost`, using the
existing helpers directly.

Suggested values:

```ts
const activePlan = deriveActivePlanState(...);
const activeProposedPlan = findSidebarProposedPlan(...);
const planAvailable = activePlan !== null || activeProposedPlan !== null;
const planLabel = activeProposedPlan || interactionMode === "plan" ? "Plan" : "Tasks";
const activeProjectRoot =
  activeThread?.worktreePath ?? activeProject?.cwd ?? undefined;
```

Pass plan tab metadata and panel into `AppShell` only when
`planAvailable` is true.

The `right` prop should no longer be a fixed `Record<WorkbenchTab, ReactNode>`
that requires every tab. Change it to a model that can express contextual tabs.

Suggested shape:

```ts
interface RightWorkbenchDefinition {
  tabs: readonly WorkbenchTabMeta[];
  panels: Partial<Record<WorkbenchTab, ReactNode>>;
}
```

Then:

```tsx
right={{
  tabs,
  panels: {
    ...(planAvailable
      ? {
          plan: (
            <WorkbenchPanel>
              <PlanWorkbenchPanel ... />
            </WorkbenchPanel>
          ),
        }
      : {}),
    git: ...,
    terminal: ...,
    files: ...,
  },
}}
```

`RightAsidePanels` should iterate over `right.tabs`, not a static array.

## Auto-Open Controller

Use a simple first-pass auto-open. Move it out of `ChatView` and into the
shell-level workbench controller.

Use existing setting:

- `settings.autoOpenPlanSidebar`

Do not add a second setting.

Behavior:

- Auto-open when a current-turn plan/task appears.
- Do not auto-open stale plans from previous turns.
- Do not auto-open when `autoOpenPlanSidebar` is false.
- Skip dismissal tracking in the first pass.

Implementation shape:

```ts
useEffect(() => {
  if (!settings.autoOpenPlanSidebar) return;
  if (!planAvailable) return;
  if (!activePlan && !activeProposedPlan) return;
  if (effectiveTab === "plan") return;

  const latestTurnId = activeThread?.latestTurn?.turnId ?? null;
  const planTurnId = activePlan?.turnId ?? activeProposedPlan?.turnId ?? null;
  if (latestTurnId && planTurnId !== latestTurnId) return;

  shellPanelsActions.activatePlanTab();
}, [
  effectiveTab,
  planAvailable,
  activePlan?.turnId,
  activeProposedPlan?.turnId,
  activeThread?.latestTurn?.turnId,
  settings.autoOpenPlanSidebar,
]);
```

This intentionally may re-open if the user switches away while the same current
turn is still producing plan updates. If that proves annoying, add session-only
dismissal tracking later. Do not add that machinery in the first pass.

## ChatView Cleanup

Update:

- `packages/app/src/components/chat/view/chat-view.tsx`

Remove:

- local `planSidebarOpen` state
- `planSidebarDismissedForTurnRef`
- `planSidebarOpenOnNextThreadRef`
- `togglePlanSidebar`
- local auto-open effect
- `<PlanSidebar />` render path
- `PlanSidebar` import

Keep or replace:

- `activePlan`
- `sidebarProposedPlan`
- `planSidebarLabel`

Those values can be replaced by the shell-derived `activePlan`,
`activeProposedPlan`, and `planLabel` once the composer and workbench receive
that state from shell-level props.

The main content area should return to one chat column. The right workbench owns
Plan/Tasks layout.

## Composer Changes

Update:

- `packages/app/src/components/chat/composer/chat-composer.tsx`
- `packages/app/src/components/chat/composer/compact-composer-controls-menu.tsx`

Rename sidebar-specific props over time:

- `planSidebarLabel` -> `planLabel`
- `planSidebarOpen` -> `planTabActive`
- `togglePlanSidebar` -> `openPlanTab`

The control should no longer toggle/hide the panel. It opens the Plan/Tasks tab.

Button behavior:

```ts
function openPlanTab() {
  shellPanelsActions.activatePlanTab();
}
```

Visible when:

- `planAvailable === true`

Copy:

- title: `Open Plan` or `Open Tasks`
- menu item: `Open Plan` or `Open Tasks`

Active styling:

- active when effective right workbench tab is `plan`

Do not use:

- `Show plan sidebar`
- `Hide plan sidebar`
- `Hide tasks sidebar`

## Timeline Card Relationship

Keep `ProposedPlanCard` in the message timeline for now.

The timeline card is chronological evidence that a plan was proposed. The
workbench tab is the persistent reference and action surface.

Both should use the same markdown helper functions from:

- `packages/app/src/proposed-plan.ts`

Do not fork plan title, filename, stripping, copy, or export logic.

## Follow-Up Phase: Editing

This is the complete path for a later editing phase. It is not required for the
canonical Plan/Tasks workbench migration, but it is specified so editing is a
known follow-up rather than an ambiguous non-goal.

To make proposed plan markdown editable:

1. Add a dispatchable client command to `packages/contracts/src/orchestration.ts`.
2. Normalize it in `packages/server/src/orchestration/Normalizer.ts` if needed.
3. Add decider handling in `packages/server/src/orchestration/decider.ts`.
4. Project to the same `projection_thread_proposed_plans` row.
5. Add app API usage in `PlanWorkbenchPanel`.
6. Add dirty-state UI with explicit Save/Revert.

Editing should update only `planMarkdown` and `updatedAt`. It must preserve:

- `createdAt`
- `turnId`
- `implementedAt`
- `implementationThreadId`

Do not edit runtime checklist steps through this path.

To make runtime todos editable later, first add a durable task model separate
from provider event history. Do not mutate historical `turn.plan.updated`
activities to represent user edits.

## Implementation Order

1. Move `useThreadPlanCatalog` out of `chat-view.tsx`.
2. Derive `activePlan`, `activeProposedPlan`, `planAvailable`, and `planLabel`
   in the shell host from existing helpers.
3. Extend `WorkbenchTab` to include `plan`.
4. Add contextual visible tabs and simple `effectiveActiveTab` fallback in
   `AppShell`.
5. Keep existing panel persistence unless typecheck forces a version bump.
6. Change right workbench props from fixed panels to contextual tab definitions.
7. Update `RightWorkbenchHeader` to render caller-provided tab metadata.
8. Update `RightAsidePanels` to iterate visible tabs.
9. Add `PlanWorkbenchPanel`.
10. Ensure `PlanWorkbenchPanel` renders task rows directly from
    `deriveActivePlanState` output and updates from thread activity changes.
11. Wire plan tab/panel in `DesktopChatShellHost`.
12. Add simple shell-level auto-open using `autoOpenPlanSidebar`.
13. Replace composer toggle semantics with open-tab semantics.
14. Remove chat-column `PlanSidebar` render path and local sidebar state.
15. Update route search parsing to accept `workbench=plan`.
16. Delete or reduce `PlanSidebar` only after all call sites are migrated.

## Acceptance Criteria

### Data Flow

- Codex harness plan item completion still creates `turn.proposed.completed`.
- Codex harness plan item deltas still create `turn.proposed.delta`.
- Completed proposed plans still appear in `Thread.proposedPlans`.
- Runtime checklist updates still derive from `turn.plan.updated`.
- Historical `turn.plan.updated` activities load a Tasks tab when a thread is
  reopened.
- Live `turn.plan.updated` activity updates change the workbench task rows
  without local-only state.
- No React component parses `<proposed_plan>` tags.
- No new plan-finalization toolcall is required.

### Workbench Tab

- Threads without plan data show only `Changes`, `Terminal`, `Files`.
- Threads with plan data show `Plan` or `Tasks` first.
- The `plan` tab uses `IconSquareChecklist`.
- `workbench=plan` is accepted in route search.
- If `activeTab === "plan"` but the current thread has no plan data, the UI
  falls back to `git`.
- Returning to a thread with plan data shows the `plan` tab again.

### Panel Rendering

- Runtime checklist steps render with correct status styling.
- Runtime checklist steps render after reloading an existing thread.
- Runtime checklist step status changes update while the turn streams.
- Proposed plan markdown renders with `ChatMarkdown`.
- When both checklist and markdown exist, both render in the same panel.
- The panel uses workbench chrome and full workbench width.
- The panel has no local close button.
- Copy, download, and save-to-project actions still work for proposed markdown.

### Auto-Open

- A new current-turn plan/task auto-opens when `autoOpenPlanSidebar` is true.
- Previous-turn plans do not auto-open.
- Disabling `autoOpenPlanSidebar` prevents auto-open.

### Composer

- The composer control appears only when the Plan/Tasks tab is available.
- The control opens the right workbench Plan/Tasks tab.
- The control copy says `Open Plan` or `Open Tasks`.
- The compact menu uses the same copy and behavior.

## Verification

Per repo instructions, after code changes run:

```bash
pnpm run typecheck
```

Do not run `pnpm run test`, `pnpm run build`, or `pnpm run dev`.

If implementation creates or modifies a test file, run only that specific test
file from the package root:

```bash
pnpx vitest --run path/to/specific.test.ts
```

Manual QA scenarios:

1. Open a thread with no plan data. Confirm no Plan/Tasks tab.
2. Open a thread with `turn.plan.updated` and no proposed plan. Confirm `Tasks`.
3. Open a thread with a proposed plan. Confirm `Plan`.
4. Open a thread with both. Confirm checklist and markdown appear together.
5. Select `Plan`, then navigate to a no-plan thread. Confirm fallback tab.
6. Return to the plan thread. Confirm the Plan/Tasks tab is visible again.
7. Reload a thread with historical `turn.plan.updated`. Confirm `Tasks` appears
   without a new stream event.
8. Produce a new current-turn checklist. Confirm auto-open.
9. Stream a todo status update. Confirm the existing row updates.
10. Use composer `Open Plan` / `Open Tasks`. Confirm the right workbench opens.
11. Copy, download, and save the plan markdown from the workbench panel.

## Files Expected To Change

First pass likely touches:

- `packages/app/src/lib/thread-plan-catalog.ts`
- `packages/app/src/components/shell/plan/plan-workbench-panel.tsx`
- `packages/app/src/stores/shell-panels-store.ts`
- `packages/app/src/components/shell/shell/app.tsx`
- `packages/app/src/components/shell/shell/right-workbench-header.tsx`
- `packages/app/src/components/shell-host.tsx`
- `packages/app/src/components/chat/view/chat-view.tsx`
- `packages/app/src/components/chat/composer/chat-composer.tsx`
- `packages/app/src/components/chat/composer/compact-composer-controls-menu.tsx`
- `packages/app/src/diff-route-search.ts`

Possible cleanup after migration:

- `packages/app/src/components/plan-sidebar.tsx`

Do not delete `PlanSidebar` until there are no imports left.

## Deferred Enhancements

These are intentionally separate enhancements after the canonical workbench
migration is complete:

- File-backed `.plan.md` storage and a multi-plan switcher.
- Proposed plan markdown editing, using the editing phase above.
- Runtime todo editing, after a durable task model exists.
- Build-in-cloud controls.
- Build selected todo controls.
- Web shell right workbench support.
- Generic background task inspector for `task.started`, `task.progress`, and
  `task.completed`.
- `lastNonPlanTab` persistence or per-plan dismissal tracking.
