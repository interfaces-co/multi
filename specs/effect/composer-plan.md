# Composer And Plan Spec

Composer and plan mode are app boundaries, not transport formats. The renderer
owns editing geometry and user intent; contracts receive plain prompt text,
attachments, terminal contexts, model selection, runtime mode, and interaction
mode.

## Goals

- [x] The browser/TanStack shell and hosted Electron shell share the same
      workbench surface.
- [x] Proposed plans render in the native right workbench, not as primary chat
      cards.
- [x] Plan implementation is an explicit workbench action.
- [x] Plan copy, download, and save-to-project actions live on the plan
      workbench.
- [ ] Composer prompt persistence stores plain prompt text and structured
      attachments/context facts only.
- [ ] Inline edit and dock composer share geometry rules without shared
      one-off class buckets.

## Composer States

New-agent composer:

- [x] Fixed maximum height.
- [x] Inner editor scroll.
- [x] Bottom row uses justified-between toolbar/actions layout.

Thread composer:

- [x] Single-line mode keeps input selector and send action on the same row.
- [x] Multi-line mode expands dynamically to the same maximum height as
      new-agent composer.
- [x] Multi-line mode moves selectors/actions into the bottom toolbar row.
- [ ] Verify inline edit height against sent-message bubble geometry after the
      remaining edit-mode latency work.

Rules:

- [x] Slash menu owns models and skills; `$` is not a separate trigger.
- [x] Prompt editor JSON does not cross composer stores, queues, or send
      boundaries.
- [ ] Delete stale slash-menu helper files and tests after caller inventory.
- [ ] Do not delete `prompt-segments.ts` or `prompt-triggers.ts` as styling
      cleanup; they are active composer/slash-menu behavior helpers.
- [ ] Replace unowned `ui-slash-menu__*`, `mentions-menu__content`, and
      `ui-menu__*` class hooks only as part of slash menu ownership cleanup.
- [ ] Keep mode toggles and keybindings configurable through the keybinding
      system.

## Plan Workbench

The plan workbench is the first-class plan surface.

Rules:

- [x] The right workbench includes the plan tab whenever the active route has
      plan mode, active plan steps, or a latest proposed plan.
- [x] Hidden workbench panels do not mount side-effectful bodies such as
      terminal hosts.
- [x] Plan tab activation is event-driven from user actions and plan
      implementation actions, not a render-time `useEffect` sync.
- [x] Proposed plan actions are copy markdown, download markdown, save to
      project, and build.
- [ ] Save-to-project errors should preserve structured RPC error detail when
      project write failures become schema-rendered in the app.

## React Effects

Direct `useEffect` is not a default state tool.

Rules:

- [x] Do not add effects to derive state from props or store values.
- [x] Use event handlers for user actions such as activating plan mode,
      building a plan, copying, downloading, or saving.
- [x] Use keyed component boundaries to reset local dialog/input state when the
      active proposed plan changes.
- [x] Replace existing prop-to-state effects in composer controls with derived
      values or keyed boundaries.
- [ ] Keep effects only for external systems: DOM/body integration, terminal
      renderer lifecycle, subscriptions, observers, and cleanup.

## Verification

- [x] `packages/app/src/proposed-plan.test.ts` covers plan markdown export
      normalization and filename derivation.
- [x] `packages/app/src/components/shell/plan/plan-workbench-panel.browser.tsx`
      covers active plan plus proposed markdown rendering.
- [x] `packages/app/src/components/chat/view/chat-view.browser.tsx` covers
      native plan workbench actions, default draft pruning, and composer footer
      containment.
- [ ] Resolve noisy WebSocket RPC schema warnings in browser tests so failures
      are not hidden by expected warning volume.

CSS ownership rules live in [app-css-files.md](./app-css-files.md).
