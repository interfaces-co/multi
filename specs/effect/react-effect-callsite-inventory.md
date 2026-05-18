# React Effect Callsite Inventory

This is the read ledger for existing React effects. It refines
[react.md](./react.md) from counts into migration categories.

Status rule:

- `[x]` means the listed callsites were read and classified.
- `[ ]` means the file is still count-only and must be read before editing.

## Categories

- `external-sync`: DOM, browser API, terminal/editor runtime, observer,
  subscription, worker, global listener, or cleanup.
- `reset-by-key`: local state reset that should become a keyed boundary when
  possible.
- `derived-state`: state mirrors props/store/query data and should become
  render-time derivation or owned store state.
- `action-relay`: state flag drives an effect that performs an action.
- `route-sync`: route/search/store synchronization that should belong to route
  actions, loaders, or explicit navigation handlers.
- `resource-cleanup`: cleanup of blob URLs, timers, subscriptions, or runtime
  resources.

## Chat View

File: `packages/app/src/components/chat/view/chat-view.tsx`

- [x] `284`: `derived-state` / `action-relay`; local dispatch state resets when
      server acknowledgement is derived. Target is reducer/store transition or a
      named local-dispatch owner.
- [x] `552`: `derived-state`; mounted terminal thread keys are reconciled from
      active/open thread state. Target is terminal state owner or retained-terminal
      hook.
- [x] `580`: `external-sync`; retains server thread detail subscription for the
      active server route.
- [x] `675`: `route-sync`; marks a thread visited from settled turn data.
      Target is route/thread visibility owner or explicit visited-state event.
- [x] `828`: `resource-cleanup`; revokes optimistic user message preview URLs
      on unmount.
- [x] `1526`: `reset-by-key`; clears pull request dialog and scroll pill state
      on active thread change.
- [x] `1533`: `reset-by-key`; clears checkpoint revert state on active thread
      change.
- [x] `1537`: `external-sync`; schedules composer focus after active thread
      change when terminal is closed.
- [x] `1547`: `derived-state` plus `resource-cleanup`; removes optimistic
      messages once server messages contain the same IDs and hands off/revokes blob
      URLs. Target is optimistic-message owner hook.
- [x] `1575`: `reset-by-key` plus `resource-cleanup`; clears optimistic
      messages, attachment handoffs, local dispatch, and expanded image on
      thread/draft change.
- [x] `1617`: `reset-by-key`; clears pending server thread env override on
      active thread change.
- [x] `1622`: `derived-state`; clears pending env override when override is no
      longer allowed.
- [x] `1630`: `route-sync`; clears terminal launch context when active thread
      changes or disappears.
- [x] `1732`: `route-sync`; clears local terminal launch context when the
      settled cwd/worktree matches active thread state.
- [x] `1763`: `route-sync`; clears stored server terminal launch context when
      settled cwd/worktree matches active thread state.
- [x] `1788`: `route-sync`; clears terminal launch context when terminal closes.
- [x] `1803`: `external-sync`; focuses composer and updates terminal focus
      request when terminal open state changes.
- [x] `1825`: `external-sync`; global keyboard listener for configurable
      terminal, diff, and project-script shortcuts.

Target:

- [ ] Extract optimistic-message lifecycle into a focused hook or keyed child.
- [ ] Move terminal launch-context reconciliation out of chat view.
- [ ] Replace active-thread reset effects with keyed child boundaries where the
      child owns the local state being reset.
- [ ] Keep thread subscription, focus, blob URL cleanup, and global keybinding
      listeners as explicit external sync.

## Composer Input

File: `packages/app/src/components/chat/composer/input.tsx`

- [x] `1117`: `derived-state`; syncs `promptRef` and clamps cursor from prompt.
      Target is event-driven ref writes or controlled composer state owner.
- [x] `1122`: `derived-state`; syncs image ref from image state.
- [x] `1126`: `derived-state`; syncs terminal-context ref from context state.
- [x] `1133`: `derived-state`; syncs highlighted menu item/search key from
      active item and menu state.
- [x] `1152`: `route-sync` / `reset-by-key`; writes pending user-input custom
      answer into prompt state when request/question changes.
- [x] `1196`: `reset-by-key`; resets composer cursor, trigger, and dismissal
      state on active thread/draft change.
- [x] `1371`: `external-sync`; document pointer listener closes the composer
      command menu on outside pointer down.

Target:

- [ ] Keep outside-pointer listener as external sync.
- [ ] Replace thread/draft reset with keyed composer state.
- [ ] Move ref synchronization into the handlers that mutate the source state.
- [ ] Treat pending-user-input prompt hydration as a composer mode boundary, not
      a generic effect.

## Prompt Editor

File: `packages/app/src/components/chat/composer/prompt-editor.tsx`

- [x] `1083`: `derived-state`; mirrors `onChange` callback into a ref.
- [x] `1087`: `derived-state`; mirrors `onCommandKeyDown` callback into a ref.
- [x] `1091`: `derived-state`; mirrors `onPaste` callback into a ref.
- [x] `1095`: `derived-state`; updates skill metadata ref from skills.
- [x] `1237`: `external-sync`; updates TipTap editable state.
- [x] `1241`: `external-sync`; reconciles controlled prompt/cursor/contexts
      into TipTap editor state.
- [x] `1298`: `external-sync`; observes editor size and reports multiline
      measurement.

Target:

- [ ] Keep TipTap editor reconciliation in an editor-owned integration hook.
- [ ] Prefer `useEffectEvent` or event-time ref writes for callback refs where
      React support allows it.
- [ ] Keep `ResizeObserver` as external sync.

## Thread Terminal Drawer

File: `packages/app/src/components/thread-terminal-drawer.tsx`

- [x] `293`: `external-sync`; creates xterm, addons, terminal event
      subscription, host subscription, selection handlers, copy/paste handlers,
      and cleanup.
- [x] `785`: `external-sync`; schedules terminal focus for auto-focus/focus
      request.
- [x] `797`: `external-sync`; fits terminal and sends resize to server.
- [x] `1032`: `derived-state`; mirrors `onHeightChange` callback into ref.
- [x] `1036`: `derived-state`; mirrors `drawerHeight` into ref.
- [x] `1047`: `reset-by-key`; resets/clamps drawer height on `height` or
      `threadId`.
- [x] `1111`: `external-sync`; window resize listener while visible.
- [x] `1125`: `external-sync`; bumps resize epoch when visible.
- [x] `1132`: `resource-cleanup`; syncs height on unmount.

Target:

- [ ] Keep xterm lifecycle in this integration component.
- [ ] Move height refs into resize handlers where possible.
- [ ] Keep window resize and unmount height sync as terminal drawer external
      sync.

## Messages Timeline

File: `packages/app/src/components/chat/timeline/messages-timeline.tsx`

- [x] `180`: `derived-state`; prunes worked-header open overrides from row
      IDs. Target is row/key owner or reducer action.
- [x] `331`: `external-sync`; exposes imperative timeline controller through
      ref and clears it on unmount.
- [x] `345`: `resource-cleanup`; clears programmatic scroll tracking on
      unmount.
- [x] `365`: `external-sync`; pins virtualized scroll to bottom on row changes
      when already at bottom.
- [x] `384`: `external-sync`; pins scroll while active turn/work is in
      progress.

Target:

- [ ] Keep virtualized scroll effects in the timeline integration component.
- [ ] Replace override pruning with reducer-owned state if the timeline state
      grows further.

## Diff Panel

File: `packages/app/src/components/diff-panel.tsx`

- [x] `280`: `route-sync`; resets diff word wrap from settings when opening the
      diff panel.
- [x] `287`: `external-sync`; scrolls selected file into view.
- [x] `384`: `external-sync`; turn-strip scroll listener and
      `ResizeObserver`.
- [x] `403`: `external-sync`; schedules turn-strip scroll-state recalculation
      after diff summary/selection changes.
- [x] `410`: `external-sync`; scrolls selected turn tab into view.

Target:

- [ ] Decide whether diff word-wrap reset belongs to open handler or persisted
      panel state.
- [ ] Keep DOM scroll and observer effects in the diff panel.

## Model Picker

Files:

- `packages/app/src/components/chat/picker/model-picker.tsx`
- `packages/app/src/components/chat/picker/model-content.tsx`

Classified:

- [x] `model-picker.tsx:108`: `external-sync`; writes popover open state to
      shared composer picker visibility and clears it on unmount.
- [x] `model-content.tsx:108`: `external-sync`; on popover open, focuses search
      and initializes rail/search state.
- [x] `model-content.tsx:381`: `external-sync`; global keydown listener for
      model jump shortcuts.

Target:

- [ ] Keep global shortcut listener in picker integration.
- [ ] Re-evaluate model picker open-state sharing when composer/model resolver
      state is simplified.

## Routes

Files:

- `packages/app/src/app/routes/chat-index-route.tsx`
- `packages/app/src/app/routes/chat-draft-route.tsx`
- `packages/app/src/app/routes/chat-thread-route.tsx`
- `packages/app/src/app/routes/chat-route.tsx`
- `packages/app/src/app/routes/settings-route.tsx`
- `packages/app/src/app/routes/root-route.tsx`

Classified:

- [x] `chat-index-route.tsx:25`: `route-sync`; reads last chat target,
      creates/selects draft when needed, applies sticky draft state, and redirects.
      Keep while route dependencies are client-store/local-storage backed after
      bootstrap.
- [x] `chat-draft-route.tsx:40`: `route-sync`; redirects promoted/canonical
      draft to server thread and persists last route target.
- [x] `chat-draft-route.tsx:52`: `route-sync`; writes draft target or clears
      stale target and redirects home.
- [x] `chat-thread-route.tsx:59`: `route-sync`; writes valid server target or
      clears stale target and redirects home.
- [x] `chat-thread-route.tsx:87`: `action-relay`; finalizes a promoted draft
      once the backing server thread starts. Keep only while this route owns that
      lifecycle transition.
- [x] `chat-route.tsx:81`: `external-sync`; global keydown listener for route
      shortcuts. Escape handling is hardcoded and should move through the
      keybinding map.
- [x] `settings-route.tsx:13`: `external-sync`; global keydown listener for
      route back action. Escape handling is hardcoded and should move through the
      keybinding map if it is product behavior.
- [x] `root-route.tsx:46`: `external-sync`; DOM/theme sync through
      `requestAnimationFrame`.
- [x] `root-route.tsx:92`: `external-sync`; syncs button cursor CSS
      variable/attribute from settings.
- [x] `root-route.tsx:217`: `external-sync`; starts server state sync and
      returns unsubscribe.
- [x] `root-route.tsx:227`: `external-sync`; starts environment connection
      service bound to query client.
- [x] `root-route.tsx:329`: `external-sync`; primary environment/active
      environment descriptor sync plus async bootstrap. Keep while root route owns
      app bootstrap; move to environment runtime service if this grows.
- [x] `root-route.tsx:358`: `resource-cleanup`; disposed-ref guard for async
      callbacks. Prefer cancellation from the async owner when available.

Target:

- [ ] Keep route navigation effects until route dependencies are synchronously
      available to loaders/guards.
- [ ] Move hardcoded Escape handling through configurable keybindings.
- [ ] Move promoted-draft finalization into a store/service owner if another
      caller needs the same invariant.

## Shell And App Hooks

Files:

- `packages/app/src/components/shell-host.tsx`
- `packages/app/src/components/shell/shell/app.tsx`
- `packages/app/src/components/web-socket-connection-surface.tsx`
- `packages/app/src/hooks/use-theme.ts`
- `packages/app/src/hooks/use-local-storage.ts`

Classified:

- [x] `shell-host.tsx:1000`: `derived-state`; clears
      `gitAgentOrchestrationHandoff` when active run starts or thread reaches
      terminal/failure states. Target is source-state derivation or cleanup inside
      the mutation/store transition.
- [x] `shell/shell/app.tsx:192`: `route-sync`; syncs route search to shell
      panel state. Keep but watch for loops with tab-change handlers.
- [x] `shell/shell/app.tsx:425`: `external-sync`; applies and cleans up
      `document.body[data-cursor-glass-mode]`.
- [x] `web-socket-connection-surface.tsx:114`: `external-sync`; browser
      `online`, `offline`, and `focus` listeners for reconnect.
- [x] `web-socket-connection-surface.tsx:133`: `external-sync`; reconnect
      countdown timer.
- [x] `web-socket-connection-surface.tsx:148`: `external-sync`; stalled
      reconnect watchdog.
- [x] `web-socket-connection-surface.tsx:180`: `external-sync`; writes
      websocket status toast. Payload derivation can be pure, but toast mutation is
      external sync.
- [x] `web-socket-connection-surface.tsx:301`: `resource-cleanup`; pending
      toast reset timer cleanup.
- [x] `web-socket-connection-surface.tsx:317`: `external-sync`; writes slow
      RPC request toast.
- [x] `use-theme.ts:210`: `external-sync`; applies current theme to DOM/desktop
      after snapshot changes.
- [x] `use-local-storage.ts:103`: `reset-by-key`; resets hook state when the
      storage key changes. Prefer caller remount by `key` or a
      `useSyncExternalStore` storage model.
- [x] `use-local-storage.ts:115`: `external-sync`; subscribes to browser
      `storage` and custom local-storage events.

Target:

- [ ] Replace `shell-host.tsx` handoff cleanup with derived/source-owned state.
- [ ] Keep websocket, theme, body attribute, and storage subscription effects as
      external sync.
- [ ] Rework `use-local-storage` only if callsites can remount by key or the
      hook moves to `useSyncExternalStore`.

## Count-Only Files Still Pending

Read before editing:

- [ ] `packages/app/src/app/toast.tsx`
- [ ] `packages/app/src/components/chat/markdown/chat-markdown.tsx`
- [ ] `packages/app/src/components/chat/message/changed-files-tree.tsx`
- [ ] `packages/app/src/components/chat/message/thinking-indicator.tsx`
- [ ] `packages/app/src/components/chat/message/tool-renderer.tsx`
- [ ] `packages/app/src/components/chat/view/attachment-preview-handoff.ts`
- [ ] `packages/app/src/components/chat/view/branch-toolbar.tsx`
- [ ] `packages/app/src/components/command-palette.tsx`
- [ ] `packages/app/src/components/diff-worker-pool-provider.tsx`
- [ ] `packages/app/src/components/pull-request-thread-dialog.tsx`
- [ ] `packages/app/src/components/settings/draft-input.tsx`
- [ ] `packages/app/src/components/settings/provider-instance-card.tsx`
- [ ] `packages/app/src/components/settings/settings-layout.tsx`
- [ ] `packages/app/src/components/settings/settings-panels.tsx`
- [ ] `packages/app/src/components/shell/agents/list.tsx`
- [ ] `packages/app/src/components/shell/agents/row.tsx`
- [ ] `packages/app/src/components/shell/files/project-file-tree.tsx`
- [ ] `packages/app/src/components/shell/files/project-files-panel.tsx`
- [ ] `packages/app/src/components/shell/git/git-changes-file-tree.tsx`
- [ ] `packages/app/src/components/shell/git/git-diff-card.tsx`
- [ ] `packages/app/src/components/shell/git/panel.tsx`
- [ ] `packages/app/src/components/shell/shell/use-column-resize.ts`
- [ ] `packages/app/src/components/shell/terminal/panel.tsx`
- [ ] `packages/app/src/hooks/use-copy-to-clipboard.ts`
- [ ] `packages/app/src/hooks/use-environment-git.ts`
- [ ] `packages/app/src/lib/desktop-update-react-query.ts`
- [ ] `packages/app/src/lib/git-status-state.ts`
- [ ] `packages/app/src/lib/thread-sidebar.ts`
- [ ] `packages/app/src/notifications/taskCompletion.tsx`
