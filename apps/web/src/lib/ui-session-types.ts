/**
 * Glass-specific types (formerly in @glass/contracts).
 *
 * Types that already exist in @t3tools/contracts (ProviderKind, ThreadId,
 * ModelSelection, ProviderInteractionMode, etc.) are NOT duplicated here --
 * import those directly from @t3tools/contracts.
 */

// ── Primitive ────────────────────────────────────────────────────────

export type Json = null | boolean | number | string | Json[] | { readonly [k: string]: Json };

// ── Blocks ───────────────────────────────────────────────────────────

export interface GlassTextBlock {
  type: "text";
  text: string;
}

export interface GlassThinkingBlock {
  type: "thinking";
  thinking: string;
  summary?: string;
}

export interface GlassImageBlock {
  type: "image";
  mimeType?: string;
  data?: string;
}

export interface GlassToolCallBlock {
  type: "toolCall";
  id?: string;
  name: string;
  arguments?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GlassUnknownBlock {
  type: string;
  [key: string]: unknown;
}

export type GlassBlock =
  | GlassTextBlock
  | GlassThinkingBlock
  | GlassImageBlock
  | GlassToolCallBlock
  | GlassUnknownBlock;

// ── Prompt ───────────────────────────────────────────────────────────

export interface GlassPromptPathAttachment {
  type: "path";
  path: string;
  name?: string;
}

export interface GlassPromptInlineAttachment {
  type: "inline";
  name: string;
  mimeType: string;
  data: string;
}

export type GlassPromptAttachment = GlassPromptPathAttachment | GlassPromptInlineAttachment;

export interface GlassPromptInput {
  text: string;
  attachments?: GlassPromptAttachment[];
}

// ── Messages ─────────────────────────────────────────────────────────

export interface GlassUserMessage {
  role: "user";
  content: string | GlassBlock[];
}

export interface GlassUserAttachmentMessage {
  role: "user-with-attachments";
  content: string | GlassBlock[];
}

export interface GlassAssistantMessage {
  role: "assistant";
  content: GlassBlock[];
  stopReason?: string;
  errorMessage?: string;
}

export interface GlassToolResultMessage {
  role: "toolResult";
  toolCallId?: string;
  content: GlassBlock[];
  toolName?: string;
  isError?: boolean;
  details?: Record<string, unknown>;
}

export interface GlassBashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode?: number;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  excludeFromContext?: boolean;
}

export interface GlassCustomMessage {
  role: "custom";
  customType: string;
  content: string | GlassBlock[];
  display: boolean;
  details?: unknown;
}

export interface GlassBranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string;
}

export interface GlassCompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
}

export interface GlassSystemMessage {
  role: "system";
  content: string | GlassBlock[];
}

export interface GlassUnknownMessage {
  role: string;
  [key: string]: unknown;
}

export type GlassMessage =
  | GlassUserMessage
  | GlassUserAttachmentMessage
  | GlassAssistantMessage
  | GlassToolResultMessage
  | GlassBashExecutionMessage
  | GlassCustomMessage
  | GlassBranchSummaryMessage
  | GlassCompactionSummaryMessage
  | GlassSystemMessage
  | GlassUnknownMessage;

// ── Session ──────────────────────────────────────────────────────────

export interface GlassSessionItem {
  id: string;
  createdAt: string;
  message: GlassMessage;
}

export interface GlassSessionSummary {
  id: string;
  harness?: HarnessKind;
  path: string;
  cwd: string;
  name: string | null;
  createdAt: string;
  modifiedAt: string;
  messageCount: number;
  firstMessage: string;
  allMessagesText: string;
  isStreaming: boolean;
}

export interface GlassSessionPending {
  steering: string[];
  followUp: string[];
}

export type GlassSessionActiveEvent = Record<string, unknown>;

export interface GlassSessionSnapshot {
  id: string;
  harness?: HarnessKind;
  file: string | null;
  cwd: string;
  name: string | null;
  model: HarnessModelRef | null;
  thinkingLevel: ThinkingLevel;
  messages: GlassSessionItem[];
  live: GlassSessionItem | null;
  working: GlassWorkingState | null;
  isStreaming: boolean;
  pending: GlassSessionPending;
}

// ── Working state ────────────────────────────────────────────────────

export interface GlassWorkingTool {
  itemId: string;
  title: string | null;
  detail: string | null;
}

export interface GlassWorkingTask {
  id: string;
  description: string | null;
  summary: string | null;
}

export type GlassWorkingStatus = "running" | "interrupted" | "error";

export interface GlassWorkingState {
  threadId: string;
  turnId: string | null;
  provider: string;
  status: GlassWorkingStatus;
  startedAt: string | null;
  updatedAt: string;
  summary: string | null;
  text: string;
  tool: GlassWorkingTool | null;
  task: GlassWorkingTask | null;
}

export interface GlassWorkingUpdate {
  threadId: string;
  working: GlassWorkingState | null;
}

// ── Ask ──────────────────────────────────────────────────────────────

export type ThreadInteractiveKind = "select" | "confirm" | "input" | "editor";

export interface GlassAskOption {
  id: string;
  label: string;
  shortcut?: string;
  recommended?: boolean;
  other?: boolean;
}

export interface GlassAskQuestion {
  id: string;
  text: string;
  options: GlassAskOption[];
  multi?: boolean;
  optional?: boolean;
}

export interface GlassAskState {
  sessionId: string;
  toolCallId: string;
  kind: ThreadInteractiveKind;
  questions: GlassAskQuestion[];
  current: number;
  values: Record<string, string[]>;
  custom: Record<string, string>;
}

export type GlassAskReply =
  | { type: "next"; questionId: string; values: string[]; custom?: string }
  | { type: "back"; questionId: string; values: string[]; custom?: string }
  | { type: "skip"; questionId: string; values?: string[]; custom?: string }
  | { type: "abort" };

// ── Harness ──────────────────────────────────────────────────────────

export type HarnessKind = "codex" | "claudeCode";

export interface HarnessModelRef {
  provider: string;
  id: string;
  name?: string | null;
  reasoning?: boolean;
}

export interface HarnessCapabilities {
  modelPicker: boolean;
  thinkingLevels: boolean;
  commands: boolean;
  interactive: boolean;
  fileAttachments: boolean;
}

export interface HarnessDescriptor {
  kind: HarnessKind;
  label: string;
  version?: string;
  available: boolean;
  enabled: boolean;
  reason?: string;
  capabilities: HarnessCapabilities;
}

// ── Thinking ─────────────────────────────────────────────────────────

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

// ── Shell / file search ──────────────────────────────────────────────

export type ShellFileKind = "file" | "dir" | "image";

export interface ShellFileHit {
  path: string;
  name: string;
  kind: ShellFileKind;
}

export interface ShellFilePreview {
  path: string;
  kind: "text" | "image";
  text?: string;
  truncated?: boolean;
  mimeType?: string | null;
  data?: string;
}

// ── Skills ───────────────────────────────────────────────────────────

export interface GlassSkill {
  id: string;
  name: string;
  description?: string;
  body: string;
}

// ── Git (Glass-specific shapes, not in @t3tools/contracts) ───────────

export type GitFileState =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "copied"
  | "untracked"
  | "ignored"
  | "conflict";

export interface GitFileSummary {
  id: string;
  path: string;
  prevPath: string | null;
  state: GitFileState;
  staged: boolean;
  insertions: number;
  deletions: number;
}

export interface GitState {
  cwd: string;
  gitRoot: string | null;
  repo: boolean;
  clean: boolean;
  count: number;
  branch: string | null;
  remote: string | null;
  ahead: number;
  behind: number;
  files: GitFileSummary[];
}

// ── Terminal (Glass-specific shapes) ─────────────────────────────────

export interface DesktopTerminalTheme {
  background?: string;
  foreground?: string;
  cursor?: string;
  cursorText?: string;
  selectionBackground?: string;
  selectionForeground?: string;
  palette?: string[];
  [key: string]: string | string[] | undefined;
}

export interface DesktopTerminalAppearance {
  fontFamily: string;
  fontSize: number;
  theme: DesktopTerminalTheme | null;
}

// ── Provider notice ──────────────────────────────────────────────────

export const PROVIDER_NOTICE_KIND = {
  rateLimit: "provider.notice.rate-limit",
  auth: "provider.notice.auth",
  config: "provider.notice.config",
} as const;

export type ProviderNoticeKind = (typeof PROVIDER_NOTICE_KIND)[keyof typeof PROVIDER_NOTICE_KIND];

export const PROVIDER_NOTICE_KINDS = Object.values(PROVIDER_NOTICE_KIND);
