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
import { Spinner } from "@multi/ui/spinner";
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
import { HumanMessage } from "./human-message";
import { AssistantMessage } from "./assistant-message";
import { WorkingStatusRow } from "./working-status-row";
import { ToolCallMessage } from "./tool-call-message";

type UserMessageTimelineRow = Extract<MessagesTimelineRow, { kind: "message" }>;

// ---------------------------------------------------------------------------
// Context — shared state consumed by every row component via useContext.
// ---------------------------------------------------------------------------

export interface TimelineRowSharedState {
  activeTurnInProgress: boolean;
  activeTurnId: TurnId | null | undefined;
  isWorking: boolean;
  isRevertingCheckpoint: boolean;
  completionSummary: string | null;
  routeThreadKey: string;
  markdownCwd: string | undefined;
  resolvedTheme: "light" | "dark";
  projectRoot: string | undefined;
  activeThreadEnvironmentId: EnvironmentId;
  isServerThread: boolean;
  onBeginEditUserMessage: ((messageId: MessageId) => void) | undefined;
  onImageExpand: (preview: ExpandedImagePreview) => void;
  onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
}

export const TimelineRowCtx = createContext<TimelineRowSharedState>(null!);

const CHAT_TIMELINE_CONTENT_STYLE = {
  boxSizing: "border-box",
  margin: "0 auto",
  maxWidth: "var(--composer-max-width, 840px)",
  width: "100%",
  paddingLeft: "var(--composer-messages-padding-inline, 16px)",
  paddingRight: "var(--composer-messages-padding-inline, 16px)",
  gap: "var(--chat-timeline-row-gap)",
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
  isRevertingCheckpoint: boolean;
  onImageExpand: (preview: ExpandedImagePreview) => void;
  activeThreadEnvironmentId: EnvironmentId;
  markdownCwd: string | undefined;
  resolvedTheme: "light" | "dark";
  projectRoot: string | undefined;
  isServerThread: boolean;
  onBeginEditUserMessage: ((messageId: MessageId) => void) | undefined;
  showEmptyState?: boolean | undefined;
  awaitingServerThreadDetail?: boolean | undefined;
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
  isRevertingCheckpoint,
  onImageExpand,
  activeThreadEnvironmentId,
  markdownCwd,
  resolvedTheme,
  projectRoot,
  isServerThread,
  onBeginEditUserMessage,
  showEmptyState = true,
  awaitingServerThreadDetail = false,
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
  const stickyUserRowIndices = useMemo(
    () => rows.flatMap((row, index) => (isUserMessageRow(row) ? [index] : [])),
    [rows],
  );
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
      routeThreadKey,
      markdownCwd,
      resolvedTheme,
      projectRoot,
      activeThreadEnvironmentId,
      isServerThread,
      onBeginEditUserMessage,
      onImageExpand,
      onOpenTurnDiff,
    }),
    [
      activeTurnInProgress,
      activeTurnId,
      isWorking,
      isRevertingCheckpoint,
      completionSummary,
      routeThreadKey,
      markdownCwd,
      resolvedTheme,
      projectRoot,
      activeThreadEnvironmentId,
      isServerThread,
      onBeginEditUserMessage,
      onImageExpand,
      onOpenTurnDiff,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: MessagesTimelineRow }) => <TimelineRowContent row={item} />,
    [],
  );

  if (rows.length === 0 && !isWorking && awaitingServerThreadDetail) {
    return (
      <div className="flex h-full items-center justify-center" aria-busy="true">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0 && !isWorking && showEmptyState) {
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
      <div
        className={cn(
          "agent-panel-meta-agent-chat-shell ui-imsg-thread relative flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden",
          "pt-[var(--chat-timeline-padding-block-start)] pb-[var(--composer-messages-scroll-bottom-inset)]",
          "[--meta-agent-thread-stack-gap:8px]",
          "[--meta-agent-thread-stack-horizontal-inset:20px]",
          "[--meta-agent-thread-stack-bottom-inset:24px]",
          "[--meta-agent-thread-stack-top-inset:16px]",
        )}
      >
        <LegendList<MessagesTimelineRow>
          ref={listRef}
          data={rows}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          stickyHeaderIndices={stickyUserRowIndices}
          estimatedItemSize={90}
          initialScrollAtEnd
          maintainScrollAtEnd
          maintainScrollAtEndThreshold={0.1}
          maintainVisibleContentPosition={{ data: false, size: true }}
          onScroll={handleScroll}
          className="agent-panel-meta-agent-chat h-full min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
          contentContainerStyle={CHAT_TIMELINE_CONTENT_STYLE}
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

function isUserMessageRow(row: MessagesTimelineRow): row is UserMessageTimelineRow {
  return row.kind === "message" && row.message.role === "user";
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
        "agent-panel-meta-agent-chat__message-entry flex w-full min-w-0 flex-col gap-1 overflow-x-hidden [content-visibility:auto] [contain-intrinsic-size:96px]",
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
        <div className="agent-panel-meta-agent-chat__row agent-panel-meta-agent-chat__row--tool-call flex w-full min-w-0">
          <WorkGroupSection groupedEntries={row.groupedEntries} />
        </div>
      )}

      {row.kind === "message" && row.message.role === "user" && (
        <div className="agent-panel-meta-agent-chat__row agent-panel-meta-agent-chat__row--human box-border flex w-full min-w-0 px-0">
          <HumanMessage
            message={row.message}
            revertTurnCount={row.revertTurnCount}
            isServerThread={ctx.isServerThread}
            onImageExpand={ctx.onImageExpand}
            onBeginEditUserMessage={ctx.onBeginEditUserMessage}
          />
        </div>
      )}

      {row.kind === "message" && row.message.role === "assistant" && (
        <div className="agent-panel-meta-agent-chat__row agent-panel-meta-agent-chat__row--assistant box-border flex w-full min-w-0 px-0">
          <AssistantMessage
            message={row.message}
            showCompletionDivider={row.showCompletionDivider}
            showAssistantCopyButton={row.showAssistantCopyButton}
            assistantTurnDiffSummary={row.assistantTurnDiffSummary}
            activeTurnInProgress={ctx.activeTurnInProgress}
            activeTurnId={ctx.activeTurnId}
            completionSummary={ctx.completionSummary}
            routeThreadKey={ctx.routeThreadKey}
            markdownCwd={ctx.markdownCwd}
            resolvedTheme={ctx.resolvedTheme}
            onOpenTurnDiff={ctx.onOpenTurnDiff}
          />
        </div>
      )}

      {row.kind === "proposed-plan" && (
        <div className="agent-panel-meta-agent-chat__row agent-panel-meta-agent-chat__row--tool-call min-w-0 px-1 py-0.5">
          <ProposedPlanCard
            planMarkdown={row.proposedPlan.planMarkdown}
            environmentId={ctx.activeThreadEnvironmentId}
            cwd={ctx.markdownCwd}
            projectRoot={ctx.projectRoot}
          />
        </div>
      )}

      {row.kind === "working" && (
        <div className="agent-panel-meta-agent-chat__row agent-panel-meta-agent-chat__row--loading flex w-full min-w-0 opacity-75">
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
  const { projectRoot } = use(TimelineRowCtx);

  return (
    <div>
      <div className="w-full">
        <div className="flex w-fit max-w-[min(100%,var(--composer-max-width))] flex-col gap-1.5">
          {groupedEntries.map((workEntry) => (
            <ToolCallMessage
              key={`work-row:${workEntry.toolCallId ?? workEntry.id}`}
              workEntry={workEntry}
              projectRoot={projectRoot}
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
