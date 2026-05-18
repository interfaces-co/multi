# App Simplification Spec

This spec turns the `pi` and opencode cleanup references into Multi app rules.
It is intentionally concrete: each retained file needs an ownership reason, and
each deletion needs a verifier that covers the behavior being kept.

## Reference Inputs

- [x] `codebase path earendil-pi` resolves to
      `/Users/workgyver/.agents/codebases/earendil-pi`.
- [x] `codebase path anomalyco-opencode` resolves to
      `/Users/workgyver/.agents/codebases/anomalyco-opencode`.
- [x] The requested opencode commit
      `f98449c9b5ef95444911e26206abb3d6479e6883` was fetched locally and its
      `packages/opencode/specs/effect/*` files were read.
- [x] `pi` was sampled from commit
      `b256ac7d7733b56e11d4c691378705c929978f15`.

## Current App Inventory

Snapshot from `rg --files packages/app/src`:

- [x] `336` app `ts` / `tsx` files.
- [x] `49` root-level app `ts` / `tsx` files.
- [x] `86` `*.test.*` / `*.browser.*` files.
- [x] `10` CSS files under `packages/app/src`.
- [x] `1` remaining `*.logic.ts` file:
      `packages/app/src/app/toast.logic.ts`.

This is a planning inventory, not a completion proof. Re-run the inventory
before starting a deletion wave.

Detailed inventories:

- [x] Root app files: [app-root-files.md](./app-root-files.md).
- [x] App state files: [app-state-files.md](./app-state-files.md).
- [x] App route files: [app-route-files.md](./app-route-files.md).
- [x] App toast files: [app-toast-files.md](./app-toast-files.md).
- [x] App CSS files: [app-css-files.md](./app-css-files.md).

## Target Shape

The app should be boring at the center:

- [ ] Route files select route params/search and render route views only.
- [ ] Shell files own shell layout, panels, and shell-local persistence only.
- [ ] Composer files own prompt editing, attachments, slash menu, send
      preparation, and inline edit geometry only.
- [ ] Model files own provider/model selection policy only.
- [ ] Store files persist facts; derived view models live near the UI that uses
      them unless multiple surfaces consume the same projection.
- [ ] `lib/*` files are kept only for cross-surface boundaries, not as a dumping
      ground for one-off helpers.
- [ ] Tests cover user behavior at the boundary that matters, not private helper
      implementation details that exist only because the helper was split out.

## Keep / Inline / Delete Rules

Keep a file when at least one is true:

- [ ] It owns a runtime boundary: WebSocket RPC, local storage, terminal host,
      xterm lifecycle, shell panel persistence, environment API, route contract, or
      generated route tree.
- [ ] It is imported by multiple production surfaces and has a stable domain
      name that explains why it changes.
- [ ] It has a test that would be weaker or less readable if moved to a broader
      integration suite.
- [ ] It isolates a third-party or platform edge: browser storage, Electron,
      xterm, Git, file dialogs, RPC, React Query, TanStack Router.

Inline a file when all are true:

- [ ] It has one production caller.
- [ ] Its name describes implementation mechanics rather than a domain boundary.
- [ ] Its test duplicates the helper implementation instead of proving a user
      behavior.
- [ ] Inlining does not make the caller exceed a readable phase structure.

Delete a file when any is true:

- [ ] It exports behavior with no production callers.
- [ ] It exists only to preserve compatibility with a deleted product surface.
- [ ] It mirrors a contract type or schema that already has a source of truth.
- [ ] It wraps a native/library function without adding domain semantics.
- [ ] Its only test asserts that the wrapper calls another wrapper.

## Done Means For A Deletion Wave

- [ ] Caller inventory was captured with `rg` or `knip`, not guessed.
- [ ] Each file was classified as keep, inline, or delete with a written reason.
- [ ] Deleted behavior is covered by a higher-level behavior test, or the spec
      states why the behavior is intentionally gone.
- [ ] `pnpm run typecheck` passes.
- [ ] Strict oxlint passes with warnings denied.
- [ ] Any modified tests were run from the relevant package root.
- [ ] `specs/effect/todo.md` is updated with checkbox status.

## First App Cleanup Waves

### Wave A: Root App Files

- [x] Classify every root `packages/app/src/*.ts(x)` file as boundary,
      candidate inline, candidate move, generated, or delete.
- [ ] Collapse root one-off helpers into existing directories:
  - [ ] `diff-route-search.ts`
  - [ ] `pending-user-input.ts`
  - [ ] `project-scripts.test.ts` behavior owner
  - [ ] `proposed-plan.ts`
  - [ ] `thread-routes.ts`
  - [ ] `worktree-cleanup.ts`
- [ ] Keep generated and entry files explicit:
  - [ ] `routeTree.gen.ts`
  - [ ] `router.ts`
  - [ ] `main.tsx`
  - [ ] `vite-env.d.ts`

Detailed inventory: [app-root-files.md](./app-root-files.md).

### Wave B: `lib/*`

- [ ] Move model/provider helpers out of `lib` and into `model` or delete them.
- [ ] Keep terminal helpers only when they are shared by composer, messages, and
      terminal surfaces.
- [ ] Re-evaluate `thread-sort.ts`, `timestamp-format.ts`, and
      `sidebar-chat-view-model.ts` as domain projections rather than generic utils.
- [ ] Delete tests whose only reason to exist is a helper split; replace with
      route/shell/composer behavior coverage where needed.

Detailed state inventory: [app-state-files.md](./app-state-files.md).

### Wave C: CSS

- [x] Classify app CSS files into token/global renderer/feature-delete buckets.
- [ ] Keep token and external renderer CSS:
  - [x] `index.css`
  - [x] `styles/tokens.css`
  - [x] `styles/terminal.css`
- [ ] Re-evaluate feature CSS files for Tailwind/component ownership:
  - [x] `styles/app.css`
  - [x] `styles/conversation.css`
  - [x] `styles/git-diff.css`
  - [x] `styles/markdown.css`
  - [x] `styles/settings.css`
  - [x] `styles/shell.css`
  - [x] `styles/tool-call.css`
- [ ] No new feature CSS file without a renderer or global token reason.

Detailed inventory: [app-css-files.md](./app-css-files.md).

### Wave D: React Effects

- [x] Inventory direct `useEffect` callsite counts in app components.
- [ ] Classify each as derived state, event action, data fetching, reset,
      external sync, subscription, observer, or DOM integration.
- [ ] Replace derived state and reset effects with inline computation or keyed
      boundaries.
- [ ] Keep terminal/xterm/subscription/observer effects with an explicit owner.

Detailed rules: [react.md](./react.md).

### Wave E: Test Shape

- [ ] Prefer browser/integration tests for sidebar, shell, composer, model
      picker, and plan interactions.
- [ ] Keep unit tests for pure domain transforms with stable inputs/outputs.
- [ ] Delete tests for helpers that are inlined or no longer public boundaries.
- [ ] Add multi-viewport sidebar coverage before deleting sidebar helper tests.

Detailed sidebar coverage: [sidebar-usability.md](./sidebar-usability.md).

## Anti-Patterns

- [x] Do not add `.logic.ts` as a way to make component tests easier.
- [ ] Do not keep a file only because it has a test.
- [ ] Do not add root-level app files for one-off helpers.
- [ ] Do not add dynamic imports or type-position imports for local code.
- [ ] Do not add generic schema bridges, generic route search helpers, or generic
      model fallback helpers.
- [ ] Do not preserve deleted product behavior for compatibility unless the
      requirement is explicit.

Remaining `.logic.ts` classification:

- [x] `packages/app/src/app/toast.logic.ts` is an inline/delete candidate, not
      a durable boundary. See [app-toast-files.md](./app-toast-files.md).
