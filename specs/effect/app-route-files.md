# App Route File Inventory

This inventory covers the renderer route layer. TanStack route files should stay
thin; route view files may bridge client stores and navigation, but they should
not accumulate product policy that belongs to shell, composer, model, plan, or
server-state owners.

Inventory commands:

```bash
find packages/app/src/routes packages/app/src/app/routes -maxdepth 2 -type f \( -name '*.ts' -o -name '*.tsx' \) | sort
for f in packages/app/src/routes/*.tsx packages/app/src/app/routes/*.{ts,tsx}; do wc -l "$f"; done
```

Current facts:

- [x] `packages/app/src/routes` has `11` TanStack route files.
- [x] `packages/app/src/app/routes` has `6` route view files and `3` route
      helper files.
- [x] Most TanStack route files are `7` to `14` lines.
- [x] `packages/app/src/routes/__root.tsx` is `29` lines and owns root
      before-load/bootstrap selection.
- [x] `packages/app/src/app/routes/root-route.tsx` is `369` lines and owns app
      bootstrap, server/environment sync, theme/body DOM sync, and root error UI.
- [x] `packages/app/src/app/routes/chat-shell-search.ts` is `76` lines.
- [x] `packages/app/src/app/routes/thread-route-targets.ts` is `59` lines.
- [x] `packages/app/src/app/routes/chat-route-persistence.ts` is `78` lines.

## Thin TanStack Route Files

Keep these files thin. They select paths, validate search, redirect simple
index routes, and hand off to route views.

- [x] `packages/app/src/routes/_chat.tsx`: validates chat shell search and
      renders `ChatRouteLayout`.
- [x] `packages/app/src/routes/_chat.$environmentId.$threadId.tsx`: validates
      chat shell search, retains search params, and renders server-thread route.
- [x] `packages/app/src/routes/_chat.draft.$draftId.tsx`: renders draft-thread
      route.
- [x] `packages/app/src/routes/_chat.index.tsx`: renders chat index route.
- [x] `packages/app/src/routes/settings.tsx`: redirects bare settings route to
      settings/general and renders settings layout.
- [x] `packages/app/src/routes/settings.*.tsx`: renders settings panel routes.
- [x] `packages/app/src/routes/__root.tsx`: root before-load and root route
      view handoff.

Rules:

- [x] TanStack route files own path params, search validation, and simple
      route-level redirects only.
- [x] TanStack route files do not own composer/model/plan/git/sidebar policy.
- [x] Search schemas stay near route ownership and are imported by components
      only when they mutate the same search contract.

## Route View Files

Keep these while they bridge client-side state that is not available to static
route definitions.

- [x] `packages/app/src/app/routes/chat-index-route.tsx`: reads last chat route
      target, creates/selects draft when needed, and redirects.
- [x] `packages/app/src/app/routes/chat-draft-route.tsx`: reconciles draft
      route, promoted draft route, local persistence, and fallback navigation.
- [x] `packages/app/src/app/routes/chat-thread-route.tsx`: validates thread
      route against store state, persists/clears last route target, and finalizes
      promoted drafts.
- [x] `packages/app/src/app/routes/chat-route.tsx`: chat layout route and
      keybinding-backed global shortcuts for command palette, new thread, and
      selected-thread cleanup.
- [x] `packages/app/src/app/routes/settings-route.tsx`: settings layout route
      and keybinding-backed route back shortcut.
- [x] `packages/app/src/app/routes/root-route.tsx`: app bootstrap,
      server/environment sync, body/theme DOM integration, and root error surface.

Rules:

- [x] Route views may bridge route state to client-only stores.
- [x] Route views may own global listeners only when the listener is route
      scoped and configured through keybindings where it is product behavior.
- [x] Route views should call shell/composer/model/plan owners instead of
      embedding those policies.
- [ ] If route state becomes synchronously available to TanStack loaders, move
      redirect logic out of render effects.

## Route Helper Files

Classify before code changes.

- [x] `packages/app/src/app/routes/chat-shell-search.ts`: shared chat shell
      search parser for diff and workbench params. Current callers are chat
      routes, diff panel, chat view, and Git panel.
- [x] `packages/app/src/app/routes/thread-route-targets.ts`: route param
      builders/resolvers for server threads and draft routes. Current callers
      include route views, toast, command palette, thread actions, shell host,
      and chat view.
- [x] `packages/app/src/app/routes/chat-route-persistence.ts`: local-storage
      persistence for the last chat route target. Current callers include chat
      route views, shell host, and sidebar footer.

Target:

- [x] Move `diff-route-search.ts` under route ownership and rename it for chat
      shell search if the shared search shape stays.
- [ ] Inline `chat-shell-search.ts` only if diff/workbench search becomes
      panel-local and routes no longer share it.
- [x] Keep `thread-route-targets.ts` while multiple surfaces need a canonical
      route target type and route param builders.
- [x] Move `chat-route-persistence.ts` under app route persistence ownership;
      do not leave it as a root helper.
- [ ] Replace helper-level tests with route behavior tests when route helpers
      move or inline.

## Search Contract

Current chat shell search:

- [x] `diff?: "1"`
- [x] `diffTurnId?: TurnId`
- [x] `diffFilePath?: string`
- [x] `workbench?: "plan" | "git" | "terminal" | "files"`

Rules:

- [x] Search params must remain serializable primitives at the route boundary.
- [x] Workbench tab search belongs to the shell/workbench route contract, not
      the plan or terminal component.
- [x] Diff search belongs to the chat route only while diff is a route-level
      panel state.

## First Route Cleanup Candidates

- [x] Move hardcoded Escape behavior in `chat-route.tsx` and
      `settings-route.tsx` into configurable keybindings.
- [x] Move `diff-route-search.ts`, `thread-routes.ts`, and
      `chat-route-persistence.ts` out of root app files into route ownership.
- [ ] Add route behavior coverage before deleting helper tests.
- [x] Keep `root-route.tsx` as app bootstrap until environment runtime startup
      has a clearer owner.

## Done Means

- [x] Route files remain thin path/search/view selectors.
- [x] Route view effects are classified in
      [react-effect-callsite-inventory.md](./react-effect-callsite-inventory.md).
- [x] Search contracts are colocated with route ownership.
- [x] Keybindings are configurable for route-level shortcuts.
- [x] `routeTree.gen.ts` is generated from the kept route files.
