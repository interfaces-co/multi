import {
  IconChevronRight,
  IconClock,
  IconConsole,
  IconEyeOpen,
  IconFileEdit,
  IconMagnifyingGlass,
  IconRobot,
  IconToolbox,
  type CentralIconBaseProps,
} from "central-icons";
type CentralIconComponent = React.ComponentType<CentralIconBaseProps>;
import { memo, type ReactNode, useEffect, useState } from "react";
import { cn } from "~/lib/utils";

export type CursorConversationDensity = "minimal" | "verbose";

export type CursorToolCase =
  | "awaitToolCall"
  | "readToolCall"
  | "grepToolCall"
  | "globToolCall"
  | "shellToolCall"
  | "editToolCall"
  | "deleteToolCall"
  | "mcpToolCall"
  | "taskToolCall"
  | "webSearchToolCall"
  | "imageViewToolCall"
  | "unknownToolCall";

export interface CursorToolCallModel {
  tool: {
    case: CursorToolCase;
    value: {
      action: string;
      details?: string | null;
      command?: string | null;
      output?: string | null;
      path?: string | null;
      stats?: {
        additions?: number | undefined;
        deletions?: number | undefined;
      };
    };
  };
}

export interface CursorToolCallDisplayOverride {
  beforeContent?: string | undefined;
  afterContent?: string | undefined;
  precomputedDiff?: ReactNode;
}

export interface CursorToolCallApproval {
  status: "pending" | "approved" | "rejected";
  label?: string | undefined;
}

export interface CursorToolCallRendererProps {
  toolCall: CursorToolCallModel;
  callId?: string | undefined;
  loading?: boolean | undefined;
  startedAtMs?: number | undefined;
  hasError?: boolean | undefined;
  approval?: CursorToolCallApproval | undefined;
  editToolCallDisplay?: CursorToolCallDisplayOverride | undefined;
  subagentConversation?: ReactNode;
  renderStep?:
    | ((step: unknown, index: number, parentCallId: string | undefined) => ReactNode)
    | undefined;
  onFileClick?: ((path: string) => void) | undefined;
  onUrlClick?: ((url: string) => void) | undefined;
  onNestedToolExpand?: ((callId: string | undefined, expanded: boolean) => void) | undefined;
  defaultExpanded?: boolean | undefined;
  conversationDensity?: CursorConversationDensity | undefined;
}

interface CursorMessageBubbleProps {
  role: "user" | "assistant";
  body: ReactNode;
  leadingIcon?: ReactNode;
  footer?: ReactNode;
  media?: ReactNode;
  interactive?: boolean;
  onClick?: (() => void) | undefined;
}

export const CursorMessageMetaRow = memo(function CursorMessageMetaRow(props: {
  alignEnd?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-[var(--cursor-spacing-2)]",
        props.alignEnd && "justify-end",
      )}
    >
      {props.children}
    </div>
  );
});

export const CursorMessageMeta = memo(function CursorMessageMeta(props: { children: ReactNode }) {
  return (
    <p className="m-0 text-[10px]/3 text-[color-mix(in_srgb,var(--cursor-text-tertiary)_56%,transparent)]">
      {props.children}
    </p>
  );
});

export const CursorMessageActions = memo(function CursorMessageActions(props: {
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-[var(--cursor-spacing-1-5)] opacity-0 transition-opacity duration-200 group-hover/cursor-bubble:opacity-100 focus-within:opacity-100">
      {props.children}
    </div>
  );
});

export const CursorMessageBubble = memo(function CursorMessageBubble({
  role,
  body,
  leadingIcon,
  footer,
  media,
  interactive = false,
  onClick,
}: CursorMessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="ui-meta-agent-human-message">
        <div className="ui-meta-agent-human-message__bubble group/cursor-bubble">
          {media}
          <div className="ui-meta-agent-human-message__body">{body}</div>
          {footer ? <div className="mt-[var(--cursor-spacing-1-5)]">{footer}</div> : null}
        </div>
      </div>
    );
  }

  const bubble = (
    <div
      className={cn(
        "ui-meta-agent-assistant-message__bubble group/cursor-bubble",
        interactive && "cursor-pointer",
      )}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onClick?.();
            }
          : undefined
      }
    >
      <div className="ui-meta-agent-assistant-message__body">{body}</div>
      {footer ? <div className="mt-[var(--cursor-spacing-1-5)]">{footer}</div> : null}
    </div>
  );

  return (
    <div
      className={cn(
        "ui-meta-agent-assistant-message",
        leadingIcon && "ui-meta-agent-assistant-message--has-leading-icon",
      )}
    >
      {leadingIcon ? (
        <div className="ui-meta-agent-assistant-message__leading-icon">{leadingIcon}</div>
      ) : null}
      {bubble}
    </div>
  );
});

export const CursorThinkingStatus = memo(function CursorThinkingStatus({
  task,
  active,
}: {
  task: string;
  active: boolean;
}) {
  return (
    <div className="ui-meta-agent-status-row">
      <IconRobot className="size-3.5 shrink-0 text-[var(--cursor-text-tertiary)]" />
      <span
        className={cn(
          "ui-meta-agent-status-row__task",
          active && "ui-meta-agent-status-row__task--shimmer",
        )}
      >
        {task}
      </span>
    </div>
  );
});

export const CursorToolCallRenderer = memo(function CursorToolCallRenderer({
  toolCall,
  callId,
  loading = false,
  startedAtMs,
  hasError = false,
  approval,
  editToolCallDisplay,
  subagentConversation,
  renderStep,
  onFileClick,
  onUrlClick,
  onNestedToolExpand,
  defaultExpanded = false,
  conversationDensity = "minimal",
}: CursorToolCallRendererProps) {
  const { action, details, command, output, path, stats } = toolCall.tool.value;
  const displayState = {
    action: resolveActionLabel(toolCall.tool.case, action, loading, hasError),
    details: details ?? "",
  };

  switch (toolCall.tool.case) {
    case "awaitToolCall":
      return (
        <CursorToolCallLine
          action={displayState.action}
          details={
            loading && startedAtMs ? (
              <CursorAwaitDetails details={displayState.details} startedAtMs={startedAtMs} />
            ) : (
              displayState.details
            )
          }
          loading={loading}
        />
      );
    case "shellToolCall":
      return (
        <CursorShellToolCall
          action={displayState.action}
          details={displayState.details}
          command={command ?? displayState.details}
          output={output ?? null}
          loading={loading}
          hasError={hasError}
          approval={approval}
          callId={callId}
          defaultExpanded={defaultExpanded}
          onNestedToolExpand={onNestedToolExpand}
        />
      );
    case "editToolCall":
    case "deleteToolCall":
      return (
        <CursorEditToolCall
          action={displayState.action}
          path={(path ?? displayState.details) || "file"}
          stats={stats}
          loading={loading}
          detail={output ?? details ?? null}
          display={editToolCallDisplay}
          isDelete={toolCall.tool.case === "deleteToolCall"}
          defaultExpanded={defaultExpanded}
          onFileClick={onFileClick}
          onNestedToolExpand={onNestedToolExpand}
          callId={callId}
          conversationDensity={conversationDensity}
        />
      );
    case "taskToolCall":
      return (
        <div className="ui-meta-agent-card">
          <div className="ui-meta-agent-card__header">
            <span className="ui-meta-agent-card__title">{displayState.action}</span>
          </div>
          <div className="ui-meta-agent-card__body">
            <CursorToolCallLine
              action={loading ? "Working on task" : displayState.action}
              details={displayState.details}
              loading={loading}
            />
            {subagentConversation}
            {renderStep?.(toolCall, 0, callId)}
          </div>
        </div>
      );
    case "webSearchToolCall":
      return (
        <CursorToolCallLine
          icon={IconMagnifyingGlass}
          action={displayState.action}
          details={displayState.details}
          loading={loading}
          onClick={
            displayState.details.startsWith("http") && onUrlClick
              ? () => onUrlClick?.(displayState.details)
              : undefined
          }
        />
      );
    case "readToolCall":
    case "grepToolCall":
    case "globToolCall":
    case "mcpToolCall":
    case "imageViewToolCall":
    case "unknownToolCall":
      return (
        <CursorToolCallLine
          icon={iconForToolCase(toolCall.tool.case)}
          action={displayState.action}
          details={displayState.details}
          loading={loading}
          onClick={path && onFileClick ? () => onFileClick(path) : undefined}
          linkable={Boolean(path && onFileClick)}
        />
      );
  }
});

interface CursorToolCallLineProps {
  action: string;
  details: ReactNode;
  loading?: boolean | undefined;
  icon?: CentralIconComponent | undefined;
  onClick?: (() => void) | undefined;
  linkable?: boolean | undefined;
}

const CursorToolCallLine = memo(function CursorToolCallLine({
  action,
  details,
  loading = false,
  icon: Icon,
  onClick,
  linkable = false,
}: CursorToolCallLineProps) {
  const role = onClick ? "button" : undefined;
  const tabIndex = onClick ? 0 : undefined;
  const content = (
    <>
      {Icon ? <Icon className="size-3.5 shrink-0 text-[var(--cursor-text-tertiary)]" /> : null}
      <span className={cn("ui-tool-call-line-action", loading && "ui-tool-call-line-shimmer")}>
        {action}
      </span>
      {details ? (
        <span
          className={cn(
            "ui-tool-call-line-details",
            linkable && "ui-tool-call-line-details--linkable",
          )}
        >
          {details}
        </span>
      ) : null}
    </>
  );

  return (
    <div
      role={role}
      tabIndex={tabIndex}
      className={cn("ui-tool-call-line", onClick && "ui-tool-call-line--clickable")}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onClick();
            }
          : undefined
      }
    >
      {content}
    </div>
  );
});

function CursorShellToolCall({
  action,
  details,
  command,
  output,
  loading,
  hasError,
  approval,
  callId,
  defaultExpanded,
  onNestedToolExpand,
}: {
  action: string;
  details: string;
  command: string;
  output: string | null;
  loading: boolean;
  hasError: boolean;
  approval: CursorToolCallApproval | undefined;
  callId: string | undefined;
  defaultExpanded: boolean;
  onNestedToolExpand: ((callId: string | undefined, expanded: boolean) => void) | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasContent = command.length > 0 || Boolean(output);
  const isPending = approval?.status === "pending";
  const expandable = hasContent;

  const toggleExpanded = () => {
    if (!expandable) return;
    setIsExpanded((current) => {
      const next = !current;
      onNestedToolExpand?.(callId, next);
      return next;
    });
  };

  return (
    <div
      className={cn(
        "ui-shell-tool-call",
        isPending && "ui-shell-tool-call--pending",
        expandable && "ui-shell-tool-call--expandable",
      )}
    >
      <div
        className={cn(
          "ui-tool-call-card ui-shell-tool-call__card",
          hasError && "[--card-border-color:var(--cursor-text-red-primary)]",
        )}
        data-has-content={isExpanded && hasContent ? "true" : undefined}
      >
        <button
          type="button"
          className="ui-tool-call-card__header ui-shell-tool-call__header"
          aria-expanded={expandable ? isExpanded : undefined}
          data-expanded={isExpanded && hasContent ? "true" : undefined}
          disabled={!expandable}
          onClick={toggleExpanded}
        >
          <span className="ui-shell-tool-call__icon-swap">
            <IconConsole className="ui-shell-tool-call__icon-default size-3.5" />
            <IconChevronRight className="ui-shell-tool-call__icon-hover size-3.5" />
          </span>
          <span className="ui-shell-tool-call__description-row">
            <span
              className={cn(
                "ui-shell-tool-call__description",
                loading && "ui-shell-tool-call__description--loading",
              )}
            >
              {action}
            </span>
            {details ? <span className="ui-shell-tool-call__line-summary">{details}</span> : null}
          </span>
        </button>
        {isExpanded && hasContent ? (
          <div className="ui-tool-call-card__body">
            <div
              className={cn(
                "ui-shell-tool-call__accordion-body",
                isPending && "ui-shell-tool-call__accordion-body--pending",
              )}
            >
              {command ? (
                <pre className="ui-shell-tool-call__command">
                  <span className="ui-shell-tool-call__prompt">$ </span>
                  <ShellCommandTokens command={command} />
                </pre>
              ) : null}
              {output ? <pre className="ui-shell-tool-call__output">{output}</pre> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CursorEditToolCall({
  action,
  path,
  stats,
  loading,
  detail,
  display,
  isDelete,
  defaultExpanded,
  onFileClick,
  onNestedToolExpand,
  callId,
}: {
  action: string;
  path: string;
  stats: CursorToolCallModel["tool"]["value"]["stats"] | undefined;
  loading: boolean;
  detail: string | null;
  display: CursorToolCallDisplayOverride | undefined;
  isDelete: boolean;
  defaultExpanded: boolean;
  onFileClick: ((path: string) => void) | undefined;
  onNestedToolExpand: ((callId: string | undefined, expanded: boolean) => void) | undefined;
  callId: string | undefined;
  conversationDensity: CursorConversationDensity;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasContent = Boolean(detail) || Boolean(display?.precomputedDiff);

  const toggleExpanded = () => {
    if (!hasContent) return;
    setIsExpanded((current) => {
      const next = !current;
      onNestedToolExpand?.(callId, next);
      return next;
    });
  };

  return (
    <div
      className={cn(
        "ui-edit-tool-call ui-edit-tool-call--minimal",
        isDelete && "ui-edit-tool-call--delete",
      )}
    >
      <div className="ui-edit-tool-call__minimal-header">
        <div
          className={cn("ui-tool-call-line", onFileClick && "ui-tool-call-line--clickable")}
          role={onFileClick ? "button" : undefined}
          tabIndex={onFileClick ? 0 : undefined}
          onClick={onFileClick ? () => onFileClick(path) : undefined}
          onKeyDown={
            onFileClick
              ? (event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onFileClick(path);
                }
              : undefined
          }
        >
          <IconFileEdit className="size-3.5 shrink-0 text-[var(--cursor-text-tertiary)]" />
          <span className="ui-tool-call-line-action">{action}</span>
          <span
            className={cn(
              "ui-edit-tool-call__filename",
              loading && "ui-edit-tool-call__filename--loading",
            )}
          >
            {path}
          </span>
        </div>
        <EditStats stats={stats} />
        {hasContent ? (
          <button
            type="button"
            className="ui-edit-tool-call__minimal-expand-button"
            aria-label={isExpanded ? "Collapse edit details" : "Expand edit details"}
            aria-expanded={isExpanded}
            onClick={toggleExpanded}
          >
            <IconChevronRight className="ui-edit-tool-call__minimal-expand-icon size-3" />
          </button>
        ) : null}
      </div>
      {isExpanded && hasContent ? (
        <div className="ui-edit-tool-call__minimal-content">
          {display?.precomputedDiff ? (
            display.precomputedDiff
          ) : (
            <pre className="ui-edit-tool-call__preview">{detail}</pre>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EditStats({
  stats,
}: {
  stats: CursorToolCallModel["tool"]["value"]["stats"] | undefined;
}) {
  const additions = stats?.additions ?? 0;
  const deletions = stats?.deletions ?? 0;
  if (additions === 0 && deletions === 0) return null;

  return (
    <span className="ui-edit-tool-call__stats">
      {additions > 0 ? <span className="ui-edit-tool-call__additions">+{additions}</span> : null}
      {deletions > 0 ? <span className="ui-edit-tool-call__deletions">-{deletions}</span> : null}
    </span>
  );
}

function CursorAwaitDetails({ details, startedAtMs }: { details: string; startedAtMs: number }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const seconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const elapsed = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return details ? `${details} ${elapsed}` : elapsed;
}

function ShellCommandTokens({ command }: { command: string }) {
  const tokens = tokenizeShellCommand(command);
  return (
    <>
      {tokens.map((token) => (
        <span key={token.start} style={{ color: shellCommandTokenColor(token.kind) }}>
          {token.value}
        </span>
      ))}
    </>
  );
}

function shellCommandTokenColor(
  kind: "whitespace" | "command" | "flag" | "string" | "operator" | "variable" | "text",
): string {
  if (kind === "command") return "var(--cursor-syntax-function,var(--cursor-text-primary))";
  if (kind === "flag") return "var(--cursor-syntax-keyword,var(--cursor-text-active))";
  if (kind === "string") return "var(--cursor-syntax-string,var(--cursor-text-green-primary))";
  if (kind === "operator") return "var(--cursor-syntax-punctuation,var(--cursor-text-secondary))";
  if (kind === "variable") return "var(--cursor-syntax-variable,var(--cursor-text-green-primary))";
  if (kind === "text") return "var(--cursor-syntax-parameter,var(--cursor-text-secondary))";
  return "inherit";
}

function tokenizeShellCommand(command: string): Array<{
  value: string;
  kind: "whitespace" | "command" | "flag" | "string" | "operator" | "variable" | "text";
  start: number;
}> {
  const result: Array<{
    value: string;
    kind: "whitespace" | "command" | "flag" | "string" | "operator" | "variable" | "text";
    start: number;
  }> = [];
  const regex =
    /"(?:[^"\\]|\\.)*"|'[^']*'|\$\{[^}]+\}|\$\w+|&&|\|\||>>|[|;><]|--?\w[\w-]*|\s+|\S+/g;
  let commandSeen = false;

  for (const match of command.matchAll(regex)) {
    const value = match[0];
    const start = match.index;
    if (/^\s+$/.test(value)) {
      result.push({ value, kind: "whitespace", start });
      continue;
    }
    if (/^(?:&&|\|\||>>|[|;><])$/.test(value)) {
      result.push({ value, kind: "operator", start });
      if (value !== ">") commandSeen = false;
      continue;
    }
    if (/^\$\{?[\w}]+$/.test(value)) {
      result.push({ value, kind: "variable", start });
      continue;
    }
    if (/^(['"]).*\1$/.test(value)) {
      result.push({ value, kind: "string", start });
      continue;
    }
    if (/^--?\w[\w-]*$/.test(value) && commandSeen) {
      result.push({ value, kind: "flag", start });
      continue;
    }
    if (!commandSeen) {
      result.push({ value, kind: "command", start });
      commandSeen = true;
      continue;
    }
    result.push({ value, kind: "text", start });
  }

  return result;
}

function resolveActionLabel(
  toolCase: CursorToolCase,
  fallback: string,
  loading: boolean,
  hasError: boolean,
) {
  const labels = TOOL_ACTION_LABELS[toolCase];
  if (!labels) return fallback;
  if (loading) return labels.loading;
  if (hasError) return labels.error;
  return labels.completed;
}

function iconForToolCase(toolCase: CursorToolCase): CentralIconComponent {
  switch (toolCase) {
    case "readToolCall":
    case "imageViewToolCall":
      return IconEyeOpen;
    case "grepToolCall":
    case "globToolCall":
    case "webSearchToolCall":
      return IconMagnifyingGlass;
    case "awaitToolCall":
      return IconClock;
    case "editToolCall":
    case "deleteToolCall":
      return IconFileEdit;
    case "shellToolCall":
      return IconConsole;
    case "mcpToolCall":
    case "taskToolCall":
    case "unknownToolCall":
      return IconToolbox;
  }
}

const TOOL_ACTION_LABELS: Record<
  CursorToolCase,
  { loading: string; completed: string; error: string }
> = {
  awaitToolCall: { loading: "Waiting", completed: "Waited", error: "Wait" },
  readToolCall: { loading: "Reading", completed: "Read", error: "Read" },
  grepToolCall: { loading: "Grepping", completed: "Grepped", error: "Grep" },
  globToolCall: { loading: "Searching files", completed: "Searched files", error: "Search files" },
  shellToolCall: { loading: "Running", completed: "Ran", error: "Run" },
  editToolCall: { loading: "Editing", completed: "Edited", error: "Edit" },
  deleteToolCall: { loading: "Deleting", completed: "Deleted", error: "Delete" },
  mcpToolCall: { loading: "Running MCP", completed: "Ran MCP", error: "Run MCP" },
  taskToolCall: { loading: "Working on task", completed: "Completed task", error: "Work on task" },
  webSearchToolCall: { loading: "Searching web", completed: "Searched web", error: "Search web" },
  imageViewToolCall: { loading: "Viewing image", completed: "Viewed image", error: "View image" },
  unknownToolCall: { loading: "Running tool", completed: "Ran tool", error: "Run tool" },
};
