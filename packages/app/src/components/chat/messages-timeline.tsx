import { type EnvironmentId, type MessageId, type TurnId } from "@multi/contracts";
import {
  createContext,
  memo,
  use,
  useCallback,
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { LegendList, type LegendListRef } from "@legendapp/list/react";
import { deriveTimelineEntries } from "../../session-logic";
import { type TurnDiffSummary } from "../../types";
import { type ExpandedImagePreview } from "./expanded-image-preview";
import { ProposedPlanCard } from "./proposed-plan-card";
import {
  computeStableMessagesTimelineRows,
  deriveMessagesTimelineRows,
  type StableMessagesTimelineRowsState,
  type MessagesTimelineRow,
} from "./messages-timeline.logic";
import { cn } from "~/lib/utils";
import { type TimestampFormat } from "@multi/contracts/settings";
import { HumanMessage } from "./human-message";
import { AssistantMessage } from "./assistant-message";
import { WorkingStatusRow } from "./working-status-row";
import { ToolCallMessage } from "./tool-call-message";

// ---------------------------------------------------------------------------
// Context — shared state consumed by every row component via useContext.
// ---------------------------------------------------------------------------

export interface TimelineRowSharedState {
  activeTurnInProgress: boolean;
  activeTurnId: TurnId | null | undefined;
  isWorking: boolean;
  isRevertingCheckpoint: boolean;
  completionSummary: string | null;
  timestampFormat: TimestampFormat;
  routeThreadKey: string;
  markdownCwd: string | undefined;
  resolvedTheme: "light" | "dark";
  workspaceRoot: string | undefined;
  activeThreadEnvironmentId: EnvironmentId;
  onRevertUserMessage: (messageId: MessageId) => void;
  onImageExpand: (preview: ExpandedImagePreview) => void;
  onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
}

export const TimelineRowCtx = createContext<TimelineRowSharedState>(null!);

const CURSOR_TIMELINE_SCROLLER_STYLE = {
  paddingTop: 12,
  paddingBottom: 24,
} satisfies CSSProperties;

const CURSOR_TIMELINE_CONTENT_STYLE = {
  boxSizing: "border-box",
  margin: "0 auto",
  maxWidth: "var(--composer-max-width, 840px)",
  width: "100%",
  paddingLeft: "var(--cursor-spacing-4, 16px)",
  paddingRight: "var(--cursor-spacing-4, 16px)",
  gap: 12,
} satisfies CSSProperties;

// ---------------------------------------------------------------------------
// Props (public API)
// ---------------------------------------------------------------------------

interface MessagesTimelineProps {
  isWorking: boolean;
  activeTurnInProgress: boolean;
  activeTurnId?: TurnId | null;
  activeTurnStartedAt: string | null;
  listRef: React.RefObject<LegendListRef | null>;
  timelineEntries: ReturnType<typeof deriveTimelineEntries>;
  completionDividerBeforeEntryId: string | null;
  completionSummary: string | null;
  turnDiffSummaryByAssistantMessageId: Map<MessageId, TurnDiffSummary>;
  routeThreadKey: string;
  onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
  revertTurnCountByUserMessageId: Map<MessageId, number>;
  onRevertUserMessage: (messageId: MessageId) => void;
  isRevertingCheckpoint: boolean;
  onImageExpand: (preview: ExpandedImagePreview) => void;
  activeThreadEnvironmentId: EnvironmentId;
  markdownCwd: string | undefined;
  resolvedTheme: "light" | "dark";
  timestampFormat: TimestampFormat;
  workspaceRoot: string | undefined;
  onIsAtEndChange: (isAtEnd: boolean) => void;
}

// ---------------------------------------------------------------------------
// MessagesTimeline — list owner
// ---------------------------------------------------------------------------

export const MessagesTimeline = memo(function MessagesTimeline({
  isWorking,
  activeTurnInProgress,
  activeTurnId,
  activeTurnStartedAt,
  listRef,
  timelineEntries,
  completionDividerBeforeEntryId,
  completionSummary,
  turnDiffSummaryByAssistantMessageId,
  routeThreadKey,
  onOpenTurnDiff,
  revertTurnCountByUserMessageId,
  onRevertUserMessage,
  isRevertingCheckpoint,
  onImageExpand,
  activeThreadEnvironmentId,
  markdownCwd,
  resolvedTheme,
  timestampFormat,
  workspaceRoot,
  onIsAtEndChange,
}: MessagesTimelineProps) {
  const rawRows = useMemo(
    () =>
      deriveMessagesTimelineRows({
        timelineEntries,
        completionDividerBeforeEntryId,
        isWorking,
        activeTurnStartedAt,
        turnDiffSummaryByAssistantMessageId,
        revertTurnCountByUserMessageId,
      }),
    [
      timelineEntries,
      completionDividerBeforeEntryId,
      isWorking,
      activeTurnStartedAt,
      turnDiffSummaryByAssistantMessageId,
      revertTurnCountByUserMessageId,
    ],
  );
  const rows = useStableRows(rawRows);
  const isAtEndRef = useRef(true);

  const handleScroll = useCallback(() => {
    const state = listRef.current?.getState?.();
    if (state) {
      isAtEndRef.current = state.isAtEnd;
      onIsAtEndChange(state.isAtEnd);
    }
  }, [listRef, onIsAtEndChange]);

  const previousRowCountRef = useRef(rows.length);
  useEffect(() => {
    const previousRowCount = previousRowCountRef.current;
    previousRowCountRef.current = rows.length;

    if (previousRowCount > 0 || rows.length === 0) {
      return;
    }

    onIsAtEndChange(true);
    isAtEndRef.current = true;
    const frameId = window.requestAnimationFrame(() => {
      void listRef.current?.scrollToEnd?.({ animated: false });
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [listRef, onIsAtEndChange, rows.length]);

  useEffect(() => {
    if (!isWorking && !activeTurnInProgress) {
      return;
    }
    if (!isAtEndRef.current) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      void listRef.current?.scrollToEnd?.({ animated: false });
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeTurnInProgress, isWorking, listRef, rows]);

  const sharedState = useMemo<TimelineRowSharedState>(
    () => ({
      activeTurnInProgress,
      activeTurnId: activeTurnId ?? null,
      isWorking,
      isRevertingCheckpoint,
      completionSummary,
      timestampFormat,
      routeThreadKey,
      markdownCwd,
      resolvedTheme,
      workspaceRoot,
      activeThreadEnvironmentId,
      onRevertUserMessage,
      onImageExpand,
      onOpenTurnDiff,
    }),
    [
      activeTurnInProgress,
      activeTurnId,
      isWorking,
      isRevertingCheckpoint,
      completionSummary,
      timestampFormat,
      routeThreadKey,
      markdownCwd,
      resolvedTheme,
      workspaceRoot,
      activeThreadEnvironmentId,
      onRevertUserMessage,
      onImageExpand,
      onOpenTurnDiff,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: MessagesTimelineRow }) => <TimelineRowContent row={item} />,
    [],
  );

  if (rows.length === 0 && !isWorking) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground/30">
          Send a message to start the conversation.
        </p>
      </div>
    );
  }

  return (
    <TimelineRowCtx.Provider value={sharedState}>
      <div className="agent-panel-meta-agent-chat-shell ui-imsg-thread h-full min-h-0">
        <LegendList<MessagesTimelineRow>
          ref={listRef}
          data={rows}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          estimatedItemSize={90}
          initialScrollAtEnd
          maintainScrollAtEnd
          maintainScrollAtEndThreshold={0.1}
          maintainVisibleContentPosition
          onScroll={handleScroll}
          className="agent-panel-meta-agent-chat h-full overflow-x-hidden overscroll-y-contain"
          style={CURSOR_TIMELINE_SCROLLER_STYLE}
          contentContainerStyle={CURSOR_TIMELINE_CONTENT_STYLE}
          ListHeaderComponent={<div />}
          ListFooterComponent={<div />}
        />
      </div>
    </TimelineRowCtx.Provider>
  );
});

function keyExtractor(item: MessagesTimelineRow) {
  return item.id;
}

// ---------------------------------------------------------------------------
// TimelineRowContent — dispatcher into extracted components
// ---------------------------------------------------------------------------

type TimelineRow = MessagesTimelineRow;

function TimelineRowContent({ row }: { row: TimelineRow }) {
  const ctx = use(TimelineRowCtx);

  return (
    <div
      className={cn(
        "ui-imsg-thread__entry agent-panel-meta-agent-chat__message-entry overflow-x-hidden",
        row.kind === "message" && row.message.role === "assistant" ? "group/assistant" : null,
      )}
      data-meta-agent-chat-bubble-id={row.id}
      data-meta-agent-chat-message-kind={timelineRowKind(row)}
      data-timeline-root="true"
      data-timeline-row-id={row.id}
      data-timeline-row-kind={row.kind}
      data-message-id={row.kind === "message" ? row.message.id : undefined}
      data-message-role={row.kind === "message" ? row.message.role : undefined}
    >
      {row.kind === "work" && (
        <div className="agent-panel-meta-agent-chat__row agent-panel-meta-agent-chat__row--tool-call">
          <WorkGroupSection groupedEntries={row.groupedEntries} />
        </div>
      )}

      {row.kind === "message" && row.message.role === "user" && (
        <div className="agent-panel-meta-agent-chat__row agent-panel-meta-agent-chat__row--human">
          <HumanMessage
            message={row.message}
            revertTurnCount={row.revertTurnCount}
            isRevertingCheckpoint={ctx.isRevertingCheckpoint}
            isWorking={ctx.isWorking}
            timestampFormat={ctx.timestampFormat}
            onImageExpand={ctx.onImageExpand}
            onRevertUserMessage={ctx.onRevertUserMessage}
          />
        </div>
      )}

      {row.kind === "message" && row.message.role === "assistant" && (
        <div className="agent-panel-meta-agent-chat__row agent-panel-meta-agent-chat__row--assistant">
          <AssistantMessage
            message={row.message}
            durationStart={row.durationStart}
            showCompletionDivider={row.showCompletionDivider}
            showAssistantCopyButton={row.showAssistantCopyButton}
            assistantTurnDiffSummary={row.assistantTurnDiffSummary}
            activeTurnInProgress={ctx.activeTurnInProgress}
            activeTurnId={ctx.activeTurnId}
            completionSummary={ctx.completionSummary}
            routeThreadKey={ctx.routeThreadKey}
            markdownCwd={ctx.markdownCwd}
            resolvedTheme={ctx.resolvedTheme}
            timestampFormat={ctx.timestampFormat}
            onOpenTurnDiff={ctx.onOpenTurnDiff}
          />
        </div>
      )}

      {row.kind === "proposed-plan" && (
        <div className="min-w-0 px-1 py-0.5">
          <ProposedPlanCard
            planMarkdown={row.proposedPlan.planMarkdown}
            environmentId={ctx.activeThreadEnvironmentId}
            cwd={ctx.markdownCwd}
            workspaceRoot={ctx.workspaceRoot}
          />
        </div>
      )}

      {row.kind === "working" && (
        <div className="agent-panel-meta-agent-chat__row agent-panel-meta-agent-chat__row--loading">
          <WorkingStatusRow createdAt={row.createdAt} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkGroupSection — tool activity group with overflow control
// ---------------------------------------------------------------------------

const WorkGroupSection = memo(function WorkGroupSection({
  groupedEntries,
}: {
  groupedEntries: Extract<MessagesTimelineRow, { kind: "work" }>["groupedEntries"];
}) {
  const { workspaceRoot } = use(TimelineRowCtx);

  return (
    <div className="ui-imsg-thread__bubble-shell">
      <div className="agent-panel-meta-agent-chat__tool-call-row">
        <div className="flex w-fit max-w-[min(100%,var(--composer-max-width))] flex-col gap-[var(--cursor-spacing-1-5)]">
          {groupedEntries.map((workEntry) => (
            <ToolCallMessage
              key={`work-row:${workEntry.toolCallId ?? workEntry.id}`}
              workEntry={workEntry}
              workspaceRoot={workspaceRoot}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

function timelineRowKind(row: TimelineRow): "human" | "assistant" | "tool-call" | "loading" {
  if (row.kind === "message") return row.message.role === "user" ? "human" : "assistant";
  if (row.kind === "working") return "loading";
  return "tool-call";
}

// ---------------------------------------------------------------------------
// Structural sharing — reuse old row references when data hasn't changed
// ---------------------------------------------------------------------------

function useStableRows(rows: MessagesTimelineRow[]): MessagesTimelineRow[] {
  const prevState = useRef<StableMessagesTimelineRowsState>({
    byId: new Map<string, MessagesTimelineRow>(),
    result: [],
  });

  return useMemo(() => {
    const nextState = computeStableMessagesTimelineRows(rows, prevState.current);
    prevState.current = nextState;
    return nextState.result;
  }, [rows]);
}
