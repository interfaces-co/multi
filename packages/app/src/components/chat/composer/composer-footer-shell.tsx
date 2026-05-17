import { Separator } from "@multi/ui/separator";
import { memo, type ReactNode } from "react";

import type { ProviderInteractionMode, RuntimeMode } from "@multi/contracts";
import type { UnifiedSettings } from "@multi/contracts/settings";
import { cn } from "~/lib/utils";
import { ContextWindowMeter } from "./context-window-meter";
import { ComposerFooterModeControls } from "./composer-footer-mode-controls";
import type { ComposerFooterPendingAction } from "./composer-input-contract";
import { ComposerPrimaryActions } from "./primary-actions";
import {
  PromptInputToolbar,
  PromptInputToolbarLeft,
  PromptInputToolbarRight,
} from "./prompt-input";
import type { ContextWindowSnapshot } from "../../../lib/context-window";

export const ComposerFooterShell = memo(function ComposerFooterShell(props: {
  isFooterCompact: boolean;
  isPrimaryActionsCompact: boolean;
  composerVariant: "compact" | "expanded";
  isDockComposerExpanded: boolean;
  providerModelPicker: ReactNode;
  compactControlsMenu: ReactNode;
  providerTraitsPicker: ReactNode;
  showInteractionModeToggle: boolean;
  interactionMode: ProviderInteractionMode;
  runtimeMode: RuntimeMode;
  showPlanTabControl: boolean;
  planLabel: string;
  planTabActive: boolean;
  primaryActionState: {
    activeContextWindow: ContextWindowSnapshot | null;
    pendingAction: ComposerFooterPendingAction;
    isRunning: boolean;
    showPlanFollowUpPrompt: boolean;
    promptHasText: boolean;
    isSendBusy: boolean;
    isConnecting: boolean;
    isPreparingWorktree: boolean;
    submitDisabled: boolean;
    hasSendableContent: boolean;
    sendWhileStreamingBehavior: UnifiedSettings["agentWindowSendWhileStreamingBehavior"];
    submitActionLabel?: string | undefined;
  };
  onToggleInteractionMode: () => void;
  onRuntimeModeChange: (mode: RuntimeMode) => void;
  openPlanTab: () => void;
  onAdvancePendingQuestion: () => void;
  onPreviousPendingQuestion: () => void;
  onInterrupt: () => void;
  onImplementPlanInNewThread: () => void;
}) {
  return (
    <PromptInputToolbar
      data-composer-input-footer="true"
      data-composer-input-footer-compact={props.isFooterCompact ? "true" : "false"}
      className={cn(
        "flex min-w-0 flex-nowrap items-center justify-between gap-2 overflow-visible px-2.5 pb-2.5 sm:px-3 sm:pb-3",
        props.isFooterCompact ? "gap-1.5" : "gap-2 sm:gap-0",
      )}
    >
      <PromptInputToolbarLeft className="-m-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
        <span
          className="inline-flex min-w-0 overflow-hidden"
          data-compact-visible=""
        >
          {props.providerModelPicker}
        </span>

        {props.isFooterCompact ? (
          <span className="inline-flex shrink-0" data-compact-visible="">
            {props.compactControlsMenu}
          </span>
        ) : (
          <span
            className="inline-flex min-w-0 shrink-0 items-center gap-1"
            data-compact-visible=""
          >
            {props.providerTraitsPicker ? (
              <>
                <Separator orientation="vertical" className="mx-0.5 hidden h-4 sm:block" />
                {props.providerTraitsPicker}
              </>
            ) : null}
            <ComposerFooterModeControls
              showInteractionModeToggle={props.showInteractionModeToggle}
              interactionMode={props.interactionMode}
              runtimeMode={props.runtimeMode}
              showPlanToggle={props.showPlanTabControl}
              planLabel={props.planLabel}
              planTabActive={props.planTabActive}
              onToggleInteractionMode={props.onToggleInteractionMode}
              onRuntimeModeChange={props.onRuntimeModeChange}
              openPlanTab={props.openPlanTab}
            />
          </span>
        )}
      </PromptInputToolbarLeft>

      <PromptInputToolbarRight
        data-composer-input-actions="right"
        data-composer-input-primary-actions-compact={
          props.isPrimaryActionsCompact ? "true" : "false"
        }
        className="flex shrink-0 flex-nowrap items-center justify-end gap-2"
      >
        {props.primaryActionState.activeContextWindow ? (
          <ContextWindowMeter usage={props.primaryActionState.activeContextWindow} />
        ) : null}
        {props.primaryActionState.isPreparingWorktree ? (
          <span className="select-none text-muted-foreground/70 text-xs">
            Preparing worktree...
          </span>
        ) : null}
        <ComposerPrimaryActions
          compact={props.isPrimaryActionsCompact}
          dockSingleRow={props.composerVariant === "compact" && !props.isDockComposerExpanded}
          pendingAction={props.primaryActionState.pendingAction}
          isRunning={props.primaryActionState.isRunning}
          showPlanFollowUpPrompt={props.primaryActionState.showPlanFollowUpPrompt}
          promptHasText={props.primaryActionState.promptHasText}
          isSendBusy={props.primaryActionState.isSendBusy}
          isConnecting={props.primaryActionState.isConnecting}
          isPreparingWorktree={props.primaryActionState.isPreparingWorktree}
          hasSendableContent={
            props.primaryActionState.hasSendableContent && !props.primaryActionState.submitDisabled
          }
          sendWhileStreamingBehavior={props.primaryActionState.sendWhileStreamingBehavior}
          submitActionLabel={props.primaryActionState.submitActionLabel}
          onAdvancePendingQuestion={props.onAdvancePendingQuestion}
          onPreviousPendingQuestion={props.onPreviousPendingQuestion}
          onInterrupt={props.onInterrupt}
          onImplementPlanInNewThread={props.onImplementPlanInNewThread}
        />
      </PromptInputToolbarRight>
    </PromptInputToolbar>
  );
});
