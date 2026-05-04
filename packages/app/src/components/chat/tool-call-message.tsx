import { memo } from "react";
import { type WorkLogEntry, type WorkLogSubagent } from "../../session-logic";
import { normalizeCompactToolLabel } from "./messages-timeline.logic";
import { formatWorkspaceRelativePath } from "../../file-path-display";
import {
  ThinkingStatus,
  ToolCallRenderer,
  type ToolCallModel,
} from "./tool-call-renderer";

type ToolCallStatus = "loading" | "completed" | "error";

interface ToolCallMessageProps {
  workEntry: WorkLogEntry;
  workspaceRoot: string | undefined;
}

export const ToolCallMessage = memo(function ToolCallMessage({
  workEntry,
  workspaceRoot,
}: ToolCallMessageProps) {
  const status = resolveStatus(workEntry);
  const isLoading = status === "loading";
  const subagents = workEntry.subagents ?? [];

  if (workEntry.tone === "thinking" && !isToolLikeWorkEntry(workEntry)) {
    return <ThinkingStatus task={resolveThinkingTask(workEntry)} active={isLoading} />;
  }

  const toolCall = toToolCall(workEntry, workspaceRoot);
  const hasSubagents = subagents.length > 0;

  return (
    <div className="min-w-0 max-w-full">
      <ToolCallRenderer
        toolCall={toolCall}
        callId={workEntry.toolCallId ?? workEntry.id}
        loading={isLoading}
        startedAtMs={Date.parse(workEntry.createdAt)}
        hasError={status === "error"}
        defaultExpanded={false}
        conversationDensity="minimal"
      />
      {hasSubagents ? <SubagentStatusSurface subagents={subagents} /> : null}
    </div>
  );
});

function SubagentStatusSurface({ subagents }: { subagents: ReadonlyArray<WorkLogSubagent> }) {
  return (
    <div className="mt-1 max-h-80 w-full overflow-x-hidden overflow-y-auto pl-5">
      {subagents.map((subagent) => (
        <div
          key={subagent.providerThreadId ?? subagent.threadId ?? subagent.agentId}
          className="group/subagent flex w-fit max-w-full items-center gap-1.5 overflow-hidden"
        >
          <div className="min-w-0">
            <div className="inline-flex min-w-0 items-baseline gap-1.5">
              <span className="min-w-0 text-[12px]/4 text-multi-fg-secondary">
                {subagent.title ?? subagent.nickname ?? subagent.role ?? "Subagent"}
              </span>
              {subagent.statusLabel || subagent.latestUpdate ? (
                <span className="min-w-0 overflow-hidden text-[11px]/[15px] text-ellipsis whitespace-nowrap text-multi-fg-tertiary">
                  {subagent.latestUpdate ?? subagent.statusLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function isToolLikeWorkEntry(workEntry: WorkLogEntry): boolean {
  return Boolean(
    workEntry.requestKind ||
    workEntry.itemType ||
    workEntry.command ||
    (workEntry.changedFiles?.length ?? 0) > 0,
  );
}

function resolveThinkingTask(workEntry: WorkLogEntry): string {
  const detail = workEntry.detail?.trim();
  if (detail) return `${resolveTitle(workEntry)} - ${detail}`;
  return resolveTitle(workEntry);
}

function toToolCall(
  workEntry: WorkLogEntry,
  workspaceRoot: string | undefined,
): ToolCallModel {
  const toolCase = resolveToolCase(workEntry);
  const action = resolveTitle(workEntry);
  const details = resolveToolDetails(workEntry, workspaceRoot);
  const command = workEntry.command ?? null;
  const output = resolveOutput(workEntry, toolCase);
  const firstChangedFile = workEntry.changedFiles?.[0] ?? null;
  const path = firstChangedFile
    ? formatWorkspaceRelativePath(firstChangedFile, workspaceRoot)
    : null;

  return {
    tool: {
      case: toolCase,
      value: {
        action,
        details,
        command,
        output,
        path,
      },
    },
  };
}

function resolveToolCase(workEntry: WorkLogEntry): ToolCallModel["tool"]["case"] {
  if (workEntry.requestKind === "command" || workEntry.itemType === "command_execution") {
    return "shellToolCall";
  }
  if (workEntry.requestKind === "file-change" || workEntry.itemType === "file_change") {
    return "editToolCall";
  }
  if (workEntry.requestKind === "file-read") {
    return "readToolCall";
  }
  if (workEntry.itemType === "web_search") {
    return "webSearchToolCall";
  }
  if (workEntry.itemType === "image_view") {
    return "imageViewToolCall";
  }
  if (workEntry.itemType === "collab_agent_tool_call") {
    return "taskToolCall";
  }
  if (workEntry.itemType === "mcp_tool_call" || workEntry.itemType === "dynamic_tool_call") {
    return "mcpToolCall";
  }
  if ((workEntry.changedFiles?.length ?? 0) > 0) {
    return "editToolCall";
  }
  if (workEntry.command) {
    return "shellToolCall";
  }
  return "unknownToolCall";
}

function resolveTitle(workEntry: WorkLogEntry): string {
  const raw = workEntry.toolTitle ?? workEntry.label;
  const normalized = normalizeCompactToolLabel(raw);
  const trimmed = normalized.trim();
  if (trimmed.length === 0) return raw;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function resolveSummary(workEntry: WorkLogEntry, workspaceRoot: string | undefined): string | null {
  if (workEntry.command) return workEntry.command;
  if (workEntry.detail) return workEntry.detail;
  if ((workEntry.changedFiles?.length ?? 0) === 0) return null;
  const [firstPath] = workEntry.changedFiles ?? [];
  if (!firstPath) return null;
  const displayPath = formatWorkspaceRelativePath(firstPath, workspaceRoot);
  return workEntry.changedFiles!.length === 1
    ? displayPath
    : `${displayPath} +${workEntry.changedFiles!.length - 1} more`;
}

function resolveOutput(
  workEntry: WorkLogEntry,
  toolCase: ToolCallModel["tool"]["case"],
): string | null {
  if (toolCase === "shellToolCall") {
    return workEntry.output ?? null;
  }
  if (toolCase === "editToolCall") {
    return workEntry.detail ?? null;
  }
  if (
    toolCase === "readToolCall" ||
    toolCase === "grepToolCall" ||
    toolCase === "globToolCall" ||
    toolCase === "mcpToolCall" ||
    toolCase === "imageViewToolCall" ||
    toolCase === "unknownToolCall"
  ) {
    return workEntry.output ?? null;
  }
  return resolveRawCommand(workEntry);
}

function resolveRawCommand(workEntry: WorkLogEntry): string | null {
  const rawCommand = workEntry.rawCommand?.trim();
  if (rawCommand && workEntry.command && rawCommand !== workEntry.command.trim()) {
    return rawCommand;
  }
  return null;
}

function resolveToolDetails(
  workEntry: WorkLogEntry,
  workspaceRoot: string | undefined,
): string | null {
  const toolCase = resolveToolCase(workEntry);
  if (toolCase === "shellToolCall" && workEntry.command) return workEntry.command;
  if (toolCase === "editToolCall" && (workEntry.changedFiles?.length ?? 0) > 0) {
    return resolveSummary(workEntry, workspaceRoot);
  }
  return resolveSummary(workEntry, workspaceRoot);
}

function resolveStatus(workEntry: WorkLogEntry): ToolCallStatus {
  if (workEntry.tone === "error" || workEntry.status === "error") return "error";
  if (workEntry.status === "running") return "loading";
  return "completed";
}
