# Chat Turn Chrome Cleanup Spec

This doc captures the implemented cleanup for chat-surface Git turn chrome:
inline changed-file summaries, the turn-level work header around tool/Git
activity, and related one-off state.

## Current Facts

- `packages/app/src/components/chat/message/assistant-message.tsx` renders
  `AssistantChangedFilesSection` after every assistant message with a
  `TurnDiffSummary`.
- That section renders:
  - `Changed files ({count})`
  - aggregate `+/-` stats
  - `Collapse` / `Expand`
  - `View diff`
  - `ChangedFilesTree`
- `ChangedFilesTree` is only the chat inline changed-files tree. The Git
  workbench uses separate Git panel/tree components.
- `packages/app/src/stores/ui-state-store.ts` persists
  `threadChangedFilesExpandedById` only for the inline changed-files section.
- `packages/app/src/components/chat/timeline/timeline-rows.ts` inserts
  `worked-header` rows after completed assistant turns. These currently show
  the "Worked for ..." turn wrapper and make preceding work rows collapsible.
- `turnDiffSummaries` are still used outside the inline summary:
  - diff workbench routing and checkpoint diff data
  - revert-count derivation for user messages
  - thread sync/store state from server checkpoints

## Target Behavior

- Chat messages should not render the inline changed-files summary/tree.
- Chat messages should not have a `Changed files` card, `View diff` button, or
  changed-files expand/collapse state.
- The Git workbench/diff panel should remain the canonical place to inspect
  turn diffs and file-level changes.
- Thread checkpoint diff data should remain in state for the diff panel and
  revert metadata.
- Composer and message widths should keep the existing Cursor-style
  `max-w-agent-chat` constraint.
- Work-log command rows should use stable row width and should not show native
  variable-width command title tooltips on hover.
- Project actions should run in the active sidebar terminal for the thread
  instead of allocating another terminal panel.

## Implementation Status

1. Removed `AssistantChangedFilesSection` from `assistant-message.tsx`.
2. Deleted `changed-files-tree.tsx` and `changed-files-tree.test.tsx`.
3. Removed `assistantTurnDiffSummary`, `onOpenTurnDiff`, and turn-diff props
   from `MessagesTimeline`.
4. Kept `turnDiffSummaryByAssistantMessageId` in `chat-view.tsx` only where it
   feeds revert-count derivation.
5. Removed `threadChangedFilesExpandedById` from `ui-state-store` and persisted
   UI state.
6. Removed `worked-header` rows and the "Worked for ..." turn wrapper.
7. Made work-log command rows fill the stable `max-w-agent-chat` lane.
8. Changed project action execution to reuse the active sidebar terminal.

## Non-Goals

- Do not delete server checkpoint diff generation.
- Do not delete the diff panel or Git workbench.
- Do not remove changed-file extraction from provider/tool events unless a
  separate pass proves the diff panel no longer needs it.
- Do not hide provider/model controls here; that belongs to the Cursor Composer
  model capability fix.

## Verification

- `pnpm --filter @multi/app exec vitest run src/components/chat/timeline/timeline-rows.test.ts`
  if `worked-header` row behavior changes.
- `pnpm --filter @multi/app exec vitest run src/components/chat/timeline/messages-timeline.test.tsx`
  if timeline props/rendering change.
- `pnpm --filter @multi/app exec vitest run src/stores/ui-state-store.test.ts`
  if `threadChangedFilesExpandedById` is removed from persisted UI state.
- `pnpm run typecheck`.

## Decision Taken

The cleanup removes both the inline `Changed files` card/tree and the
`Worked for ...` completed-turn wrapper around tool/Git activity.
