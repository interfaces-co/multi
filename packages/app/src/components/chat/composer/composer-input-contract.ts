import type {
  ApprovalRequestId,
  EnvironmentId,
  ModelSelection,
  ProviderApprovalDecision,
  ProviderDriverKind,
  ProviderInstanceId,
  ProviderInteractionMode,
  ResolvedKeybindingsConfig,
  RuntimeMode,
  ScopedThreadRef,
  ServerProvider,
  ThreadId,
} from "@multi/contracts";
import type { UnifiedSettings } from "@multi/contracts/settings";
import type { MutableRefObject } from "react";

import type { ComposerPromptDoc } from "../../../composer-prompt-doc";
import type {
  ComposerImageAttachment,
  DraftId,
} from "../../../composer-draft-store";
import type { QueuedComposerItem, QueuedComposerItemId } from "../../../composer-queue-store";
import type {
  TerminalContextDraft,
  TerminalContextSelection,
} from "../../../lib/terminal-context";
import type { PendingUserInputDraftAnswer } from "../../../pending-user-input";
import type { PendingApproval, PendingUserInput } from "../../../session-logic";
import type { SessionPhase, Thread } from "../../../types";
import type { ExpandedImagePreview } from "../message/expanded-image-preview";
import type { PromptInputMenuPlacement } from "./prompt-input";

export interface ComposerInputHandle {
  focusAtEnd: () => void;
  focusAt: (cursor: number) => void;
  openModelPicker: () => void;
  toggleModelPicker: () => void;
  isModelPickerOpen: () => boolean;
  readSnapshot: () => {
    value: string;
    cursor: number;
    expandedCursor: number;
    terminalContextIds: string[];
  };
  /** Reset composer cursor/trigger/highlight after external prompt mutations, such as send. */
  resetCursorState: (options?: {
    cursor?: number;
    prompt?: string;
    detectTrigger?: boolean;
  }) => void;
  /** Insert a terminal context from the terminal drawer. */
  addTerminalContext: (selection: TerminalContextSelection) => void;
  /** Read prompt, attachments, effort, model, and provider state for dispatch. */
  getSendContext: () => {
    prompt: string;
    promptDoc: ComposerPromptDoc | null;
    images: ComposerImageAttachment[];
    terminalContexts: TerminalContextDraft[];
    selectedPromptEffort: string | null;
    selectedModelOptionsForDispatch: unknown;
    selectedModelSelection: ModelSelection;
    selectedProvider: ProviderDriverKind;
    selectedModel: string;
    selectedProviderModels: ReadonlyArray<ServerProvider["models"][number]>;
  };
}

export interface ComposerInputProps {
  variant?: "hero" | "dock";
  modelPickerPlacement?: PromptInputMenuPlacement;
  composerDraftTarget: ScopedThreadRef | DraftId;
  environmentId: EnvironmentId;
  routeKind: "server" | "draft";
  routeThreadRef: ScopedThreadRef;
  draftId: DraftId | null;

  activeThreadId: ThreadId | null;
  activeThreadEnvironmentId: EnvironmentId | undefined;
  activeThread: Thread | undefined;
  isServerThread: boolean;
  isLocalDraftThread: boolean;

  phase: SessionPhase;
  isConnecting: boolean;
  isSendBusy: boolean;
  isPreparingWorktree: boolean;
  submitDisabled?: boolean | undefined;
  queuedComposerItems?: QueuedComposerItem[] | undefined;
  editingQueuedComposerItemId?: QueuedComposerItemId | null | undefined;

  activePendingApproval: PendingApproval | null;
  pendingApprovals: PendingApproval[];
  pendingUserInputs: PendingUserInput[];
  activePendingProgress: {
    questionIndex: number;
    isLastQuestion: boolean;
    canAdvance: boolean;
    customAnswer: string;
    activeQuestion: { id: string } | null;
  } | null;
  activePendingResolvedAnswers: Record<string, unknown> | null;
  activePendingIsResponding: boolean;
  activePendingDraftAnswers: Record<string, PendingUserInputDraftAnswer>;
  activePendingQuestionIndex: number;
  respondingRequestIds: ApprovalRequestId[];

  showPlanFollowUpPrompt: boolean;
  activeProposedPlan: Thread["proposedPlans"][number] | null;
  planAvailable: boolean;
  planLabel: string;
  planTabActive: boolean;

  runtimeMode: RuntimeMode;
  interactionMode: ProviderInteractionMode;

  providerStatuses: ReadonlyArray<ServerProvider>;
  activeProjectDefaultModelSelection: ModelSelection | null | undefined;
  activeThreadModelSelection: ModelSelection | null | undefined;

  activeThreadActivities: Thread["activities"] | undefined;

  resolvedTheme: "light" | "dark";
  settings: UnifiedSettings;
  keybindings: ResolvedKeybindingsConfig;
  terminalOpen: boolean;
  gitCwd: string | null;

  promptRef: MutableRefObject<string>;
  composerImagesRef: MutableRefObject<ComposerImageAttachment[]>;
  composerTerminalContextsRef: MutableRefObject<TerminalContextDraft[]>;

  shouldAutoScrollRef: MutableRefObject<boolean>;
  scheduleStickToBottom: () => void;

  onSend: (e?: { preventDefault: () => void }) => void;
  onInterrupt: () => void;
  onImplementPlanInNewThread: () => void;
  onRespondToApproval: (
    requestId: ApprovalRequestId,
    decision: ProviderApprovalDecision,
  ) => Promise<void>;
  onSelectActivePendingUserInputOption: (
    questionId: string,
    optionLabel: string,
    advanceAfterSelect?: boolean,
  ) => void;
  onAdvanceActivePendingUserInput: (
    draftAnswersOverride?: Record<string, PendingUserInputDraftAnswer>,
  ) => void;
  onPreviousActivePendingUserInputQuestion: () => void;
  onChangeActivePendingUserInputCustomAnswer: (
    questionId: string,
    value: string,
    nextCursor: number,
    expandedCursor: number,
    cursorAdjacentToMention: boolean,
  ) => void;

  onProviderModelSelect: (instanceId: ProviderInstanceId, model: string) => void;
  onBeginEditQueuedComposerItem?: ((itemId: QueuedComposerItemId) => void) | undefined;
  onCancelEditingQueuedComposerItem?: (() => void) | undefined;
  onRemoveQueuedComposerItem?: ((itemId: QueuedComposerItemId) => void) | undefined;
  onSendQueuedComposerItemNow?: ((itemId: QueuedComposerItemId) => void) | undefined;
  toggleInteractionMode: () => void;
  handleRuntimeModeChange: (mode: RuntimeMode) => void;
  handleInteractionModeChange: (mode: ProviderInteractionMode) => void;
  openPlanTab: () => void;

  focusComposer: () => void;
  scheduleComposerFocus: () => void;
  setThreadError: (threadId: ThreadId | null, error: string | null) => void;
  onExpandImage: (preview: ExpandedImagePreview) => void;
}

export type ComposerFooterPendingAction = {
  questionIndex: number;
  isLastQuestion: boolean;
  canAdvance: boolean;
  isResponding: boolean;
  isComplete: boolean;
} | null;
