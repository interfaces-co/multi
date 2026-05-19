# Chat Turn Chrome Cleanup Spec

This doc defines the chat-surface cleanup for redundant Git turn chrome and the
canonical Cursor-style work-log presentation.

## Source Facts

- Cursor keeps file-level change inspection out of the chat transcript. The
  diff/Git workbench is the inspection surface; chat gets compact activity
  summaries.
- Cursor groups AI activity at the conversation/pair grouping layer. A grouped
  activity row can render `Worked for <duration>` plus compact child rows such
  as `Explored 2 files, 2 searches`.
- Cursor's compact tool line is text-first:
  - action span
  - details span
  - optional chevron immediately after the visible text cluster
  - no leading icon in the simple `ToolCallLine`
- Cursor's compact line uses CSS layout, not pre-measured text:
  `display: flex`, `gap: 4px`, `white-space: nowrap`, `overflow: hidden`,
  `text-overflow: ellipsis`, and tabular numbers.
- Cursor does not reserve a far-right affordance column for compact tool-line
  chevrons. Expansion affordances live with the line text and move only because
  the text itself grows.
- Cursor shell rows have a richer expandable shell renderer. The collapsed
  summary still follows the same rule: `Ran` or `Running` plus command details,
  with output/details behind expansion.
- Cursor caches completed turn grouping by a stable signature of conversation
  identity, grouping mode, pending decisions, text length, density, shell
  grouping, and collapse mode. Completed turns should not be recomputed just
  because the user navigates away and back.

## Deleted Legacy Surface

- `AssistantChangedFilesSection` after assistant messages.
- Inline `Changed files ({count})` card, aggregate stats, `View diff`, and
  chat-local changed-file expand/collapse state.
- `ChangedFilesTree` for the inline chat summary.
- Persisted `threadChangedFilesExpandedById` UI state.
- The old `worked-header` timeline row type and split-row override pruning.

## Canonical Target

- Chat messages do not render inline changed-file cards or file trees.
- The Git workbench/diff panel remains the canonical place to inspect turn
  diffs and file-level changes.
- Thread checkpoint diff data remains in state for diff routing and user-message
  revert metadata.
- Work activity renders as one canonical work-group row in
  `timeline-rows.ts`, not as a separate header row grafted around neighboring
  rows.
- The work-group row owns:
  - `groupedEntries`
  - duration start/end facts
  - running/completed state
  - derived summary action/details/stats
- `messages-timeline.tsx` renders that row as a compact group:
  - full `max-w-agent-chat` lane
  - transparent background
  - `Worked for <duration>` header
  - local expand/collapse only
  - compact summary line
  - compact child tool rows
- Work-group expansion is not persisted. It is transcript presentation state,
  not a user preference.
- Compact tool rows expose the full chat lane to layout so truncation is stable
  across render, navigation, and hover. The row/hit area may be full width, but
  the visible action/details/chevron cluster is intrinsic up to `max-width:
100%`.
- The action is fixed width. Details use `min-width: 0`, CSS overflow, and
  browser-native ellipsis. Details can consume remaining width only as text,
  not as a spacer before an affordance.
- The chevron is not justified to the far edge. It sits next to the visible
  text cluster. Do not use `justify-between`, `ml-auto`, or a `flex-1` text
  cluster that pushes the chevron away from the text.
- Compact tool rows must not use `PretextOneLine` or any other mount-time text
  measurement for collapsed labels. Text measurement is acceptable only inside
  expanded output bodies where multi-line output sizing is the feature.
- Work-log command rows should not show native variable-width command title
  tooltips on hover.
- Project actions run in the shell workbench terminal for the target cwd, using
  the active shell terminal session id. They must not use chat/thread terminal
  state or allocate a second terminal panel for script actions.

## Naming And Styling Rules

- Do not add decorative CSS buckets such as `ui-task-tool-call__header`.
- Keep Tailwind utilities on the element or in existing `cva` variants.
- Use `central-icons` only where an icon is actually part of the target surface.
  Compact simple work lines are text-first.
- Keep the chat lane constrained by the existing `max-w-agent-chat` contract.
- Keep vertical spacing tight between grouped activity rows; Cursor collapses
  margins around compact tool rows.
- Use stable element names for real product surfaces only. Do not add a class
  just to carry one declaration when utilities or an existing variant own it.

## Non-Goals

- Do not delete server checkpoint diff generation.
- Do not delete the diff panel or Git workbench.
- Do not remove changed-file extraction from provider/tool events unless a
  separate pass proves the diff panel no longer needs it.
- Do not hide provider/model controls here; that belongs to the Cursor Composer
  model capability work.
- Do not reintroduce persisted chat-local changed-file or work-group expansion
  state.

## Verification

- Default verifier for code changes: `pnpm run typecheck`.
- Run focused tests only when the change creates, modifies, or debugs a test, or
  when explicitly requested for this slice.
- Required visual check before merging the chat chrome cleanup: compact
  command/tool rows must keep the full `max-w-agent-chat` lane available for
  truncation, but chevrons must remain adjacent to the visible text cluster.
  Covered by
  `packages/app/src/components/chat/timeline/messages-timeline.browser.tsx`.

## Implementation State

- The old inline changed-files surface is removed.
- The old `worked-header` split-row model should stay deleted.
- The canonical Cursor-style work group now lives in the timeline row model and
  renders with local, non-persisted expansion state.
- Compact tool-line renderers use CSS overflow/ellipsis instead of
  `PretextOneLine`; current caller inventory shows `PretextOneLine` is not used
  by chat compact tool rows.
- Compact expandable rows do not use `justify-between`, `ml-auto`, or a
  `flex-1` text cluster in `tool-renderer.tsx`; the chevron remains adjacent to
  the intrinsic visible action/details cluster.
- Browser coverage verifies the compact work-row layout uses the available chat
  lane, does not overflow the work-group lane, and keeps the chevron adjacent to
  the visible details text.
