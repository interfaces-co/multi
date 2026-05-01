import { memo } from "react";
import {
  BotIcon,
  EyeIcon,
  GlobeIcon,
  HammerIcon,
  type LucideIcon,
  SquarePenIcon,
  TerminalIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
import { type WorkLogEntry } from "../../session-logic";
import { normalizeCompactToolLabel } from "./messages-timeline.logic";
import { ToolCallCard } from "./tool-call-card";
import { formatWorkspaceRelativePath } from "../../file-path-display";

type ToolCallStatus = "loading" | "completed" | "error";

interface ToolCallMessageProps {
  workEntry: WorkLogEntry;
  workspaceRoot: string | undefined;
  isActiveTurnInProgress: boolean;
  isLast?: boolean;
}

export const ToolCallMessage = memo(function ToolCallMessage({
  workEntry,
  workspaceRoot,
  isActiveTurnInProgress,
  isLast = false,
}: ToolCallMessageProps) {
  const icon = resolveIcon(workEntry);
  const title = resolveTitle(workEntry);
  const summary = resolveSummary(workEntry, workspaceRoot);
  const detail = resolveDetail(workEntry);
  const status = resolveStatus(workEntry, isActiveTurnInProgress);

  return (
    <ToolCallCard
      icon={icon}
      title={title}
      summary={summary}
      detail={detail}
      status={status}
      isLast={isLast}
    />
  );
});

function resolveIcon(workEntry: WorkLogEntry): LucideIcon {
  if (workEntry.requestKind === "command") return TerminalIcon;
  if (workEntry.requestKind === "file-read") return EyeIcon;
  if (workEntry.requestKind === "file-change") return SquarePenIcon;
  if (workEntry.requestKind === "permissions") return WrenchIcon;
  if (workEntry.requestKind === "mcp-elicitation") return HammerIcon;
  if (workEntry.requestKind === "dynamic-tool") return WrenchIcon;
  if (workEntry.requestKind === "auth-refresh") return ZapIcon;

  if (workEntry.itemType === "command_execution" || workEntry.command) return TerminalIcon;
  if (workEntry.itemType === "file_change" || (workEntry.changedFiles?.length ?? 0) > 0)
    return SquarePenIcon;
  if (workEntry.itemType === "web_search") return GlobeIcon;
  if (workEntry.itemType === "image_view") return EyeIcon;

  switch (workEntry.itemType) {
    case "mcp_tool_call":
      return WrenchIcon;
    case "dynamic_tool_call":
    case "collab_agent_tool_call":
      return HammerIcon;
  }

  if (workEntry.tone === "error") return BotIcon;
  if (workEntry.tone === "thinking") return BotIcon;
  return ZapIcon;
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

function resolveDetail(workEntry: WorkLogEntry): string | null {
  const rawCommand = workEntry.rawCommand?.trim();
  if (rawCommand && workEntry.command && rawCommand !== workEntry.command.trim()) {
    return rawCommand;
  }
  return null;
}

function resolveStatus(workEntry: WorkLogEntry, isActiveTurnInProgress: boolean): ToolCallStatus {
  if (workEntry.tone === "error") return "error";
  if (workEntry.tone === "tool" && isActiveTurnInProgress) return "loading";
  return "completed";
}
