# Plan/Task Panel Direction

This note captures the Cursor workbench dissection, what Multi has today, and the direction I would take for moving Multi's plan/task panel into the right workbench as a contextual persisted tab.

## Cursor Findings

I inspected Cursor's bundled workbench files:

- `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js`
- `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css`

The important architecture is not one component. Cursor splits plan mode into four separate layers.

### 1. Plan Storage Is A First-Class Model

Cursor has a dedicated plan storage service in the bundle:

- `out-build/vs/workbench/contrib/composer/browser/services/planStorageService.js`
- storage key: `composer.planRegistry`
- redirect key: `composer.planRedirects`
- URI scheme: `cursor-plan`
- file format: `.plan.md`
- default user location: `~/.cursor/plans`
- workspace fallback: `<workspace>/.cursor/plans`

The file format is markdown with YAML frontmatter. The frontmatter owns structured plan metadata:

- `name`
- `overview`
- `todos`
- `isProject`
- `phases`

The body owns the rich markdown plan text. Cursor parses and reserializes this through structured YAML helpers instead of treating the whole document as anonymous markdown.

The registry tracks:

- plan id
- display name
- real URI
- creating composer
- edited-by composer ids
- referenced-by composer ids
- built-by composer ids
- timestamps

This gives Cursor a stable object identity for a plan independent of where the UI displays it.

### 2. Plan Creation Is A Tool Flow, Not A UI Side Effect

Cursor has explicit create-plan handlers:

- `createPlanToolCallHandler.js`
- `createPlanQueryHandler.js`
- `todoToolCallHandler.js`

The `CREATE_PLAN` tool creates or updates a plan file, registers it, and then may open it in an editor when the focused composer is the source. The handler records plan id and plan URI back onto the tool bubble metadata, so chat UI, plan editor, and build controls are all referring to the same plan object.

Auto-opening is constrained. Cursor checks whether the relevant composer is focused or was the previous focused bubble before opening the plan editor. It does not globally steal focus for every background plan event.

### 3. The Plan Tab Is A Persisted Workbench Tab

Cursor's Glass tab persistence has a dedicated `Plan` tab kind. The relevant methods in the bundled tab service include:

- `openPlanTab`
- `_openPlanTabForAgent`
- `_tryReplaceOrFocusExistingPlanTab`
- `_activateStablePlanTab`

The behavior:

- Opening a plan tracks analytics, resolves an owning agent id, and activates an external workbench tab.
- If a tab for the same plan and owner already exists, Cursor replaces/focuses it instead of duplicating it.
- Otherwise it inserts a new plan tab, near the plan launcher placeholder when present.
- In a per-app-tab layout policy, Cursor activates a stable plan tab rather than creating agent-specific plan tabs.

This is the part that maps most directly to Multi's desired "external persisted tab" direction.

### 4. The Pending Plan Tray Is Separate From The Plan Tab

Cursor also has a small pending-plan tray component:

- `PlanTray`
- `PlanBuildControls`
- `PlanTabHeader`
- `PlanEditor`
- `PlanTodosSection`

The pending tray is not the canonical plan surface. It is a prompt-level callout that appears only when there is a pending plan and the agent is no longer streaming.

The hook shape is roughly:

- get latest plan for the active agent
- get derived plan status
- show tray only when latest plan status is pending
- do not show while streaming
- auto-open the plan tab once per plan when configured
- allow dismissing the tray per `agentId:planId`

The tray actions are:

- view plan
- build locally
- build in cloud when gated and available
- build in parallel when multitask mode is gated and available
- dismiss

This is a strong separation: the tray is ephemeral; the tab is persistent.

### 5. Plan Status Is Derived

Cursor derives plan status from plan todos and plan execution activity. The bundle has two key status concepts:

- build status: none, active, complete
- derived status: pending, in progress, complete

Simplified behavior:

- no plan entry means pending
- todos all completed/cancelled means complete
- an active execution or any started todo means in progress
- otherwise pending

The plan tab disables editing/building while the plan is actively building or streaming.

### 6. The Plan Editor Is Editable And Rich

Cursor's plan tab has:

- breadcrumb/header with workspace, "Plans", filename/plan switcher
- model picker
- Build button/dropdown
- More menu: Preview/Markdown, Copy as Markdown, Find in Plan, Save to Workspace
- rich markdown editor
- editable todo list
- bulk todo status updates
- selected todo build action
- find-in-plan integration
- dirty state and save integration

The current Multi panel is much simpler, but Cursor proves the plan surface should be treated like a workbench document/tool, not like a temporary chat adornment.

## Multi Current State

Multi already has the pieces needed for a first pass, but they live inside `ChatView`.

Relevant files:

- `packages/app/src/components/plan-sidebar.tsx`
- `packages/app/src/components/chat/view/chat-view.tsx`
- `packages/app/src/components/chat/composer/chat-composer.tsx`
- `packages/app/src/components/chat/composer/compact-composer-controls-menu.tsx`
- `packages/app/src/session-logic.ts`
- `packages/app/src/stores/shell-panels-store.ts`
- `packages/app/src/components/shell/shell/app.tsx`
- `packages/app/src/components/shell/shell/right-workbench-header.tsx`

### Current Plan/Task Panel

`PlanSidebar` currently renders as a sibling of the chat column:

- fixed width: `340px`
- border-left
- local close button
- active plan/todo steps from `turn.plan.updated`
- proposed plan markdown from stored proposed plans
- actions for proposed plans:
  - copy
  - download markdown
  - save to project

The panel is controlled by local `ChatView` state:

- `planSidebarOpen`
- `planSidebarDismissedForTurnRef`
- `planSidebarOpenOnNextThreadRef`

The composer displays a Plan/Tasks toggle when:

- there is an active runtime plan
- there is a sidebar proposed plan
- the sidebar is already open

This is useful, but it is not Cursor-like. It is local to the chat surface and competes with the main timeline width.

### Current Data Sources

`deriveActivePlanState` reads `turn.plan.updated` activities and produces:

- explanation
- turn id
- ordered steps
- step statuses: `pending`, `inProgress`, `completed`

`findSidebarProposedPlan` resolves the proposed plan to show. It handles the important case where the active turn is implementing a source plan from another thread.

`hasActionableProposedPlan` checks whether a proposed plan has not been implemented.

These are good model boundaries. The weakness is that the derived plan state currently lives only inside `ChatView`, so shell-level UI cannot use it without duplicating logic or lifting the selector.

### Current Right Workbench

Multi already has the shell area where this belongs:

- `AppShell`
- `RightAside`
- `RightWorkbenchHeader`
- `RightAsidePanels`
- `WorkbenchPanel`
- `RightWorkbenchLayout`
- `shell-panels-store`

The right workbench is already persisted through `multi.shell.panels.v3`:

- `rightOpen`
- `rightW`
- `activeTab`
- `muted`

Current tabs are:

- `git`
- `terminal`
- `files`

The right workbench also already has the correct UX properties:

- persistent width
- persisted active tab
- resize sash
- shell-level titlebar toggle
- tab chrome separate from chat
- `keepMounted` panel slots

This is the right place for Plan/Tasks.

## Direction

The recommended direction is to turn the current local `PlanSidebar` into a contextual right workbench tab.

Use one stable tab id:

```ts
type WorkbenchTab = "plan" | "files" | "git" | "terminal";
```

Use a dynamic label:

- `Plan` when there is a proposed plan or the thread interaction mode is `plan`
- `Tasks` when there are runtime todo steps but no proposed plan

Use the existing Central Icons icon already used by the composer:

- `IconSquareChecklist`

Do not show the tab when neither an active plan nor a proposed plan exists.

### Recommended Semantics

The Plan/Tasks tab should be visible when:

- `deriveActivePlanState(...) !== null`, or
- `findSidebarProposedPlan(...) !== null`

The tab should be hidden when both are absent.

If the stored active workbench tab is `plan` and the current thread has no plan/task, the effective visible tab should fall back to the last non-plan tab. Do not render an empty plan tab.

When the user later opens a thread that has a plan/task, the persisted active tab can become effective again. That preserves the "I like having plan open" preference without showing a dead tab on threads that have no plan.

### Recommended Store Change

Move from `multi.shell.panels.v3` to a new persisted shape, likely `multi.shell.panels.v4`.

Add:

- `activeTab: WorkbenchTab`
- `lastNonPlanTab: Exclude<WorkbenchTab, "plan">`

When setting a non-plan tab, update `lastNonPlanTab`.

When `activeTab === "plan"` but plan is not available, render `lastNonPlanTab`.

This avoids a blank right sidebar and avoids losing the user's preference for the plan tab.

### Recommended Shell Shape

Lift the plan panel state out of `ChatView` into a shared selector/hook, something like:

```ts
interface PlanWorkbenchState {
  activePlan: ActivePlanState | null;
  activeProposedPlan: LatestProposedPlanState | null;
  label: "Plan" | "Tasks";
  available: boolean;
  planKey: string | null;
}
```

Then use it in:

- `ShellHost` / `DesktopChatShellHost` to decide whether to include the right workbench tab and panel
- `ChatComposer` only to expose a lightweight "open Plan/Tasks tab" control when available

The hook should reuse the existing logic from `ChatView`:

- `deriveActivePlanState`
- `findSidebarProposedPlan`
- `useThreadPlanCatalog` logic, moved out of `chat-view.tsx` into a reusable module

### Recommended Panel Component

Refactor `PlanSidebar` into a workbench panel component:

- keep the existing step list
- keep proposed plan markdown actions
- remove the local sidebar close button from the panel body
- let right workbench chrome own open/close
- use full workbench width rather than fixed `w-[340px]`
- keep scroll containment inside the panel

Suggested component split:

- `PlanWorkbenchPanel`
- `PlanStepsSection`
- `ProposedPlanSection`
- `PlanActionsMenu`

The existing `PlanSidebar` can either be deleted or reduced to a compatibility wrapper during the transition.

### Recommended Auto-Open Behavior

Cursor's behavior is the right model:

- auto-open once when a new actionable plan/task appears
- do not keep stealing focus after the user switches away
- suppress repeat auto-open per plan/turn key
- do not auto-open stale plans from previous turns

Multi already has this behavior locally through `planSidebarDismissedForTurnRef`. Move that logic to the shell-level plan tab controller.

Use a key like:

```ts
const planKey =
  activeProposedPlan ? `proposed:${threadId}:${activeProposedPlan.id}` :
  activePlan ? `steps:${threadId}:${activePlan.turnId ?? activePlan.createdAt}` :
  null;
```

When the user switches from `plan` to any other tab, mark the current `planKey` as dismissed for this session.

Use the existing setting:

- `autoOpenPlanSidebar`

That setting exists in the schema but is not currently used. I would either wire it into this behavior or rename it in a separate cleanup. Do not add a second setting for the same behavior.

### Recommended Tab Ordering

Use this order when the plan tab is available:

1. Plan/Tasks
2. Changes
3. Terminal
4. Files

Reasoning:

- the plan/task tab is contextual and should be discoverable when it exists
- Changes and Terminal remain stable workbench tools
- Files stays available but lower priority

When no plan/task exists, keep today's order:

1. Changes
2. Terminal
3. Files

### Recommended Composer Change

The composer should stop describing the control as showing/hiding a sidebar.

Current copy:

- `Show plan sidebar`
- `Hide plan sidebar`

Recommended copy:

- `Open Plan`
- `Open Tasks`

The button should:

- set the right workbench active tab to `plan`
- open/unmute the right workbench
- not render when no plan/task exists

Closing the right workbench should be done through the existing shell titlebar right-sidebar toggle.

### Recommended Scope For First Implementation

First pass:

- move the current panel into the right workbench as a contextual persisted tab
- preserve existing data sources
- preserve copy/download/save-to-project
- preserve current active plan/proposed plan behavior
- respect `autoOpenPlanSidebar`
- remove the local chat-column sidebar
- update composer controls to open the workbench tab

Do not add in the first pass:

- editable plan markdown
- editable todo rows
- file-backed plan storage
- multi-plan switcher
- build-in-cloud controls
- build selected todo controls
- `.multi/plans` or `.cursor/plans` equivalent

Those are Cursor-inspired follow-ups, but they are a larger product decision. Multi already persists proposed plans in orchestration projections and runtime todo plans in thread activities, so adding file-backed plan documents is not required for the right workbench migration.

## Open Decisions

These are the questions that materially affect the implementation.

### 1. Should the tab id be `plan` even when the label is `Tasks`?

Recommended answer: yes.

Use one stable tab id, `plan`, and dynamic display text. This keeps persistence simple and matches the idea that task steps and proposed plans are two states of the same planning surface.

### 2. Should the right workbench itself auto-open for a new plan?

Recommended answer: yes, only once per new latest-turn plan/task, and only if `autoOpenPlanSidebar` is true.

This matches Cursor's auto-open-with-suppression behavior and keeps important plan output visible without fighting the user.

### 3. Should switching away from the Plan tab count as dismissing it?

Recommended answer: yes, for the current plan key only.

If the user switches to Changes or Terminal after seeing the plan, later updates in the same plan should not steal the workbench back. A new plan/turn can auto-open again.

### 4. Should plans from previous turns keep the tab visible?

Recommended answer: yes.

The tab should remain available when a thread has a latest plan/task state, even if it came from a prior turn. But auto-open should only happen for current-turn arrivals.

This keeps the tab useful as a persistent reference without surprising focus changes.

### 5. Should proposed plan markdown and runtime todo steps appear together?

Recommended answer: yes.

When both exist, show:

1. runtime steps first if they are active/in-progress
2. proposed plan markdown below

Cursor's plan editor treats plan body and todos as one document surface. Multi should do the same conceptually even if the first pass remains read-only.

### 6. Should the old `PlanSidebar` stay as a fallback?

Recommended answer: no.

Keeping both surfaces will create inconsistent open/close state and duplicated semantics. Move the surface to the right workbench and update call sites.

### 7. Should web mode get this tab?

Recommended answer: not in the first pass unless the right workbench is already available there.

Today `ShellHost` passes `right={null}` for non-Electron chat. The requested behavior is specifically right-sidebar/workbench architecture. Keep the first pass to the desktop shell unless we intentionally add the right workbench to web too.

## Implementation Outline

1. Move the thread plan catalog selector out of `chat-view.tsx`.
2. Add a shared `usePlanWorkbenchState` hook that derives active runtime steps, proposed plan, label, availability, and a stable plan key.
3. Extend `WorkbenchTab` to include `plan`.
4. Add persisted `lastNonPlanTab` handling and sanitize persisted tab state.
5. Update `RightWorkbenchHeader` to accept visible tabs and dynamic tab metadata.
6. Update `RightAsidePanels` to render only visible tabs and use an effective active tab.
7. Add `PlanWorkbenchPanel` by refactoring `PlanSidebar`.
8. Add the contextual `plan` panel in `DesktopChatShellHost`.
9. Replace `ChatView` local `planSidebarOpen` state with shell-level plan tab activation.
10. Change composer controls from toggle-sidebar semantics to open-plan-tab semantics.
11. Wire `autoOpenPlanSidebar` into shell-level auto-open behavior.
12. Remove the chat-column `<PlanSidebar />` render path.

## Verification Direction

Per repository instructions, after code changes run:

```bash
pnpm run typecheck
```

Do not run tests unless explicitly requested. If an implementation changes or adds a test file, then run only that specific test file as required by the repo instructions.

For manual QA, verify:

- no Plan/Tasks tab when there is no active plan or proposed plan
- tab appears when `turn.plan.updated` exists
- tab appears when a proposed plan exists
- tab label switches between `Tasks` and `Plan`
- selecting Plan persists across threads that have plans
- threads without plans fall back to the last non-plan tab
- auto-open triggers once for a new current-turn plan
- switching away suppresses repeat auto-open for the same plan key
- composer button opens the right workbench Plan/Tasks tab
- close behavior uses the existing right workbench chrome
