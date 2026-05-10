# Agent Window Queued Send Plan

Status: researched on 2026-05-10. This plan covers the broken queued-message path only. Usage-summary display is already a simple settings/display policy and does not need the queue architecture below.

## Answer

The current `QueuedComposerSendSnapshot` path is a one-off. It captures one React-local snapshot, clears the composer, and waits for an effect in `chat-view.tsx` to replay it. That is not how Cursor models the feature.

The dumber and more canonical shape is a queue as data:

- `queueItems: QueuedComposerItem[]`
- `editingQueueItemId: QueuedComposerItemId | null`
- queue actions: add, edit, remove, send now, dispatch first eligible item
- the normal submit path is reused with an explicit internal bypass so an auto-dispatched queue item does not queue itself again

No new server queue protocol is needed for the first fix. Multi already has `thread.turn.start` and `thread.turn.interrupt`; the queue can live in the app/composer layer and drain through the existing command path.

## Sources Checked

- Local Cursor app bundle: `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js`
- Local Cursor version: `3.4.1`
- Cursor setting key in the bundle: `cursor.composer.queueMessageDefaultBehavior`
- Cursor official changelog: https://cursor.com/changelog/1-4
- Multi queue implementation currently in `packages/app/src/components/chat-view.tsx`, `chat-composer.tsx`, and `composer-primary-actions.tsx`

## Verified Cursor Model

Cursor initializes composer data with:

- `queueItems: []`
- `isQueueExpanded: true`
- `editingQueueItemId: undefined`
- `editingQueueItemSnapshot: undefined`

Cursor has a composer queuing capability (`rl.QUEUING`) with these behaviors:

- `getQueueItems()` and `setQueueItems()` read/write `composerData.queueItems`.
- `onStartSubmitChatReturnShouldStop()` intercepts normal submit while the composer status is `generating`.
- While generating, submit creates a queue item from text, rich text, context, model overrides, and mode overrides, then clears composer text/rich text/context.
- If the user is editing an existing queue item, submit replaces that queue item at its previous index instead of appending a second one.
- `tryDispatchNextQueueItem()` dispatches the first queue item only when the composer is not generating and the first item is not currently being edited.
- Auto-dispatch calls the normal chat submit service with internal flags equivalent to `ignoreQueuing`, `skipClearInput`, and `isAutoQueuedDispatch`.
- The queue UI exposes edit, send now, remove, and reorder controls. Edit loads the queue item back into the composer and sets `editingQueueItemId` plus `editingQueueItemSnapshot`.

The official Cursor changelog says messages sent while Cursor is working run at the next ideal time, with modifier overrides for queueing and interrupt-and-send. The local bundle confirms the setting and the data model behind that behavior.

## Current Multi Mismatch

Current Multi code added:

- `QueuedComposerSendSnapshot`
- one `queuedComposerSend` state value in `chat-view.tsx`
- `queuedComposerSendRef`
- an effect that drains after `phase !== "running"`
- a `queuedSendActive` boolean passed into composer buttons

That breaks down because the queue is not a real composer/conversation concept:

- There is no queue item id.
- There is no visible queued item to inspect.
- There is no edit/remove/send-now action.
- There is no array, so a second queued prompt is rejected instead of modeled.
- The queued item is local to one mounted `ChatView` route instance.
- The queue state is not tied to composer draft state, so restoring queued text into the composer requires special-case code.
- The primary action is disabled once something is queued, which makes editing impossible from the composer itself.

## Recommended Multi Shape

Implement the queue as a small composer queue model, not as another branch in `onSend`.

Add a queue item type:

```ts
type QueuedComposerItem = {
  id: MessageId;
  threadKey: string;
  prompt: string;
  promptDoc: ComposerPromptDoc | null;
  images: ComposerImageAttachment[];
  terminalContexts: TerminalContextDraft[];
  modelSelection: ModelSelection;
  runtimeMode: RuntimeMode;
  interactionMode: ProviderInteractionMode;
  planFollowUp: { planMarkdown: string } | null;
  createdAt: string;
};
```

Use `MessageId` for the queue item id so the eventual `thread.turn.start` can reuse it as the user message id. That keeps queued UI, optimistic UI, and server message identity aligned.

Place the queue state beside existing composer draft state, not inside provider/server state. The preferred home is `composer-draft-store.ts`, because it already owns per-thread composer content and route/draft identity. If image-attachment queue persistence is too large for the first patch, keep the queue in a dedicated app store keyed by `threadKey`, but keep the same queue item/actions API so it can move into `composer-draft-store.ts` later without changing `ChatComposer`.

## Implementation Plan

1. Remove the one-off queue path from `chat-view.tsx`:
   - delete `QueuedComposerSendSnapshot`
   - delete `queuedComposerSend`
   - delete `queuedComposerSendRef`
   - delete the `phase !== "running"` drain effect
   - stop passing `queuedSendActive` as the only queue UI state

2. Add queue actions:
   - `enqueueComposerItem(item)`
   - `removeQueuedComposerItem(id)`
   - `beginEditingQueuedComposerItem(id)`
   - `cancelEditingQueuedComposerItem()`
   - `replaceEditingQueuedComposerItem(item)`
   - `sendQueuedComposerItemNow(id)`
   - `dispatchNextQueuedComposerItem()`

3. Change running submit behavior:
   - If setting is `queue`, enqueue the current composer content and clear the live composer.
   - If setting is `stop-and-send`, enqueue the current composer content, dispatch `thread.turn.interrupt`, then drain when the current turn settles.
   - If setting is `send`, use the existing immediate `thread.turn.start` path.
   - If submit is an internal queue dispatch, bypass the running-submit behavior so the item does not re-enter the queue.

4. Make edit use the composer as the edit surface:
   - Load the queue item content into the composer.
   - Set `editingQueueItemId`.
   - Keep the original item in the queue while editing.
   - Do not auto-dispatch the first item while it is being edited.
   - On submit while running, replace the item at its original index.
   - On submit while idle, remove the item and send it immediately.

5. Render a real queue UI:
   - Show queued items above or inside the composer footer area.
   - Each item needs edit, send now, and remove.
   - Reordering can be a second patch unless we explicitly want Cursor parity.
   - The submit button should not become a dead "Message queued" button; the queued item itself carries that state.

6. Drain rules:
   - Drain only when there is a queued first item, no edit is active for that item, no send is already in flight, and the thread is not in a running phase.
   - `sendQueuedComposerItemNow(id)` removes the item and dispatches through the same internal queue-dispatch path.
   - `stop-and-send` should interrupt first, then rely on the same drain rule.

7. Keep server/provider changes out of this patch:
   - Do not add orchestration queue events.
   - Do not add provider queue state.
   - Do not change `thread.turn.start` command shape.
   - Do not implement Cursor's "next ideal time after a tool call" until Multi has an explicit provider/runtime safe point for mid-turn followups.

## Open Confirmation

Before implementation, confirm one product detail:

- Should queued items survive app reloads and thread navigation when they contain image attachments?

If yes, put queue items in `composer-draft-store.ts` and persist their attachments using the existing draft attachment pattern. If no, use a smaller in-memory queue store keyed by `threadKey` for the first patch.
