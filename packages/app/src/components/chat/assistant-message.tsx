import { type TurnId } from "@multi/contracts";
import { memo, useEffect, useState } from "react";
import { formatElapsed } from "../../session-logic";
import { type TurnDiffSummary } from "../../types";
import { summarizeTurnDiffStats } from "../../lib/turn-diff-tree";
import ChatMarkdown from "../chat-markdown";
import { Button } from "@multi/ui/button";
import { ChangedFilesTree } from "./changed-files-tree";
import { DiffStatLabel, hasNonZeroStat } from "./diff-stat-label";
import { MessageCopyButton } from "./message-copy-button";
import { resolveAssistantMessageCopyState } from "./messages-timeline.logic";
import { useUiStateStore } from "~/ui-state-store";
import { type TimestampFormat } from "@multi/contracts/settings";
import { formatTimestamp } from "../../timestamp-format";
import { type ChatMessage } from "../../types";
import { CursorMessageBubble, CursorMessageMeta, CursorMessageMetaRow } from "./cursor-chat-bundle";

interface AssistantMessageProps {
  message: ChatMessage;
  durationStart: string;
  showCompletionDivider: boolean;
  showAssistantCopyButton: boolean;
  assistantTurnDiffSummary: TurnDiffSummary | undefined;
  activeTurnInProgress: boolean;
  activeTurnId: TurnId | null | undefined;
  completionSummary: string | null;
  routeThreadKey: string;
  markdownCwd: string | undefined;
  resolvedTheme: "light" | "dark";
  timestampFormat: TimestampFormat;
  onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
}

export const AssistantMessage = memo(function AssistantMessage({
  message,
  durationStart,
  showCompletionDivider,
  showAssistantCopyButton,
  assistantTurnDiffSummary,
  activeTurnInProgress,
  activeTurnId,
  completionSummary,
  routeThreadKey,
  markdownCwd,
  resolvedTheme,
  timestampFormat,
  onOpenTurnDiff,
}: AssistantMessageProps) {
  const messageText = message.text || (message.streaming ? "" : "(empty response)");
  const assistantTurnStillInProgress =
    activeTurnInProgress &&
    activeTurnId !== null &&
    activeTurnId !== undefined &&
    message.turnId === activeTurnId;
  const assistantCopyState = resolveAssistantMessageCopyState({
    text: message.text ?? null,
    showCopyButton: showAssistantCopyButton,
    streaming: message.streaming || assistantTurnStillInProgress,
  });

  const footer = (
    <CursorMessageMetaRow>
      <CursorMessageMeta>
        {message.streaming ? (
          <LiveMessageMeta
            createdAt={message.createdAt}
            durationStart={durationStart}
            timestampFormat={timestampFormat}
          />
        ) : (
          formatMessageMeta(
            message.createdAt,
            formatElapsed(durationStart, message.completedAt),
            timestampFormat,
          )
        )}
      </CursorMessageMeta>
      {assistantCopyState.visible ? (
        <div className="flex items-center opacity-0 transition-opacity duration-200 group-hover/assistant:opacity-100">
          <MessageCopyButton
            text={assistantCopyState.text ?? ""}
            size="icon-xs"
            variant="outline"
            className="border-border/50 bg-background/35 text-muted-foreground/45 shadow-none hover:border-border/70 hover:bg-background/55 hover:text-muted-foreground/70"
          />
        </div>
      ) : null}
    </CursorMessageMetaRow>
  );

  const body = (
    <>
      <div className="agent-panel-meta-agent-chat__assistant-markdown">
        <ChatMarkdown
          text={messageText}
          cwd={markdownCwd}
          isStreaming={Boolean(message.streaming)}
        />
      </div>
      <AssistantChangedFilesSection
        turnSummary={assistantTurnDiffSummary}
        routeThreadKey={routeThreadKey}
        resolvedTheme={resolvedTheme}
        onOpenTurnDiff={onOpenTurnDiff}
      />
    </>
  );

  return (
    <div className="min-w-0">
      {showCompletionDivider && (
        <div className="my-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px]/3 tracking-[0.14em] text-muted-foreground/80 uppercase">
            {completionSummary ? `Response \u2022 ${completionSummary}` : "Response"}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      <CursorMessageBubble role="assistant" body={body} footer={footer} />
    </div>
  );
});

// ---------------------------------------------------------------------------
// AssistantChangedFilesSection
// ---------------------------------------------------------------------------

const AssistantChangedFilesSection = memo(function AssistantChangedFilesSection({
  turnSummary,
  routeThreadKey,
  resolvedTheme,
  onOpenTurnDiff,
}: {
  turnSummary: TurnDiffSummary | undefined;
  routeThreadKey: string;
  resolvedTheme: "light" | "dark";
  onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
}) {
  if (!turnSummary) return null;
  const checkpointFiles = turnSummary.files;
  if (checkpointFiles.length === 0) return null;

  return (
    <AssistantChangedFilesSectionInner
      turnSummary={turnSummary}
      checkpointFiles={checkpointFiles}
      routeThreadKey={routeThreadKey}
      resolvedTheme={resolvedTheme}
      onOpenTurnDiff={onOpenTurnDiff}
    />
  );
});

function AssistantChangedFilesSectionInner({
  turnSummary,
  checkpointFiles,
  routeThreadKey,
  resolvedTheme,
  onOpenTurnDiff,
}: {
  turnSummary: TurnDiffSummary;
  checkpointFiles: TurnDiffSummary["files"];
  routeThreadKey: string;
  resolvedTheme: "light" | "dark";
  onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
}) {
  const allDirectoriesExpanded = useUiStateStore(
    (store) => store.threadChangedFilesExpandedById[routeThreadKey]?.[turnSummary.turnId] ?? true,
  );
  const setExpanded = useUiStateStore((store) => store.setThreadChangedFilesExpanded);
  const summaryStat = summarizeTurnDiffStats(checkpointFiles);
  const changedFileCountLabel = String(checkpointFiles.length);

  return (
    <div className="mt-2 rounded-lg border border-multi-stroke bg-multi-editor overflow-hidden">
      <div className="flex h-7 items-center justify-between gap-2 border-b border-multi-stroke px-2">
        <p className="text-body text-foreground/80">
          <span>Changed files ({changedFileCountLabel})</span>
          {hasNonZeroStat(summaryStat) && (
            <>
              <span className="mx-1.5 text-muted-foreground/40">&bull;</span>
              <DiffStatLabel additions={summaryStat.additions} deletions={summaryStat.deletions} />
            </>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="h-5 px-1.5 text-detail"
            data-scroll-anchor-ignore
            onClick={() => setExpanded(routeThreadKey, turnSummary.turnId, !allDirectoriesExpanded)}
          >
            {allDirectoriesExpanded ? "Collapse" : "Expand"}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="h-5 px-1.5 text-detail"
            onClick={() => onOpenTurnDiff(turnSummary.turnId, checkpointFiles[0]?.path)}
          >
            View diff
          </Button>
        </div>
      </div>
      <div className="p-2">
        <ChangedFilesTree
          key={`changed-files-tree:${turnSummary.turnId}`}
          turnId={turnSummary.turnId}
          files={checkpointFiles}
          allDirectoriesExpanded={allDirectoriesExpanded}
          resolvedTheme={resolvedTheme}
          onOpenTurnDiff={onOpenTurnDiff}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function LiveMessageMeta({
  createdAt,
  durationStart,
  timestampFormat,
}: {
  createdAt: string;
  durationStart: string | null | undefined;
  timestampFormat: TimestampFormat;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [durationStart]);
  const elapsed = durationStart
    ? formatElapsed(durationStart, new Date(nowMs).toISOString())
    : null;
  return <>{formatMessageMeta(createdAt, elapsed, timestampFormat)}</>;
}

function formatMessageMeta(
  createdAt: string,
  duration: string | null,
  timestampFormat: TimestampFormat,
): string {
  if (!duration) return formatTimestamp(createdAt, timestampFormat);
  return `${formatTimestamp(createdAt, timestampFormat)} \u2022 ${duration}`;
}
