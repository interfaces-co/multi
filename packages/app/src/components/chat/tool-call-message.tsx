import { memo } from "react";
import { type WorkLogEntry } from "../../session-logic";
import { normalizeCompactToolLabel } from "./messages-timeline.logic";
import { formatWorkspaceRelativePath } from "../../file-path-display";
import {
  CursorThinkingStatus,
  CursorToolCallRenderer,
  type CursorToolCallModel,
} from "./cursor-chat-bundle";

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

  if (workEntry.tone === "thinking" && !isToolLikeWorkEntry(workEntry)) {
    return <CursorThinkingStatus task={resolveThinkingTask(workEntry)} active={isLoading} />;
  }

  const toolCall = toCursorToolCall(workEntry, workspaceRoot);

  return (
    <CursorToolCallRenderer
      toolCall={toolCall}
      callId={workEntry.toolCallId ?? workEntry.id}
      loading={isLoading}
      startedAtMs={Date.parse(workEntry.createdAt)}
      hasError={status === "error"}
      defaultExpanded={false}
      conversationDensity="minimal"
    />
  );
});

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

function toCursorToolCall(
  workEntry: WorkLogEntry,
  workspaceRoot: string | undefined,
): CursorToolCallModel {
  const toolCase = resolveToolCase(workEntry);
  const action = resolveTitle(workEntry);
  const details = resolveCursorDetails(workEntry, workspaceRoot);
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

function resolveToolCase(workEntry: WorkLogEntry): CursorToolCallModel["tool"]["case"] {
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
  toolCase: CursorToolCallModel["tool"]["case"],
): string | null {
  if (toolCase === "shellToolCall") {
    return workEntry.detail ?? resolveRawCommand(workEntry);
  }
  if (toolCase === "editToolCall") {
    return workEntry.detail ?? null;
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

function resolveCursorDetails(
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
