export const COMPOSER_COMMAND_IDS = [
  "composer.acceptComposerStep",
  "composer.acceptPendingFromNotification",
  "composer.addfilestocomposer",
  "composer.addfilestonewcomposer",
  "composer.addsymbolstocomposer",
  "composer.addsymbolstonewcomposer",
  "composer.approvePendingShellToolDecision",
  "composer.approvePendingShellToolDecisionAllowlist",
  "composer.cancelChat",
  "composer.cancelComposerStep",
  "composer.cancelComposerStepInputFocused",
  "composer.cancelTerminalToolCall",
  "composer.clearComposerTabs",
  "composer.closeComposerTab",
  "composer.closeOtherComposerTabs",
  "composer.copyRequestId",
  "composer.copyRequestIdFromEditor",
  "composer.copyRequestIdFromPane",
  "composer.createNewComposerTab",
  "composer.createNewWithPrevContext",
  "composer.cycleMode",
  "composer.cycleModel",
  "composer.cycleModelParameter",
  "composer.duplicateChat",
  "composer.exportChatAsMd",
  "composer.find.focus",
  "composer.find.hide",
  "composer.find.next",
  "composer.find.previous",
  "composer.fixerrormessage",
  "composer.focusComposer",
  "composer.forkSharedChat",
  "composer.getComposerHandleById",
  "composer.getOrderedSelectedComposerIds",
  "composer.handleBugBotDeeplink",
  "composer.handleBugBotMultipleDeeplinks",
  "composer.newAgentChat",
  "composer.nextChatTab",
  "composer.openAddContextMenu",
  "composer.openAsBar",
  "composer.openAsPane",
  "composer.openChatAsEditor",
  "composer.openComposer",
  "composer.openComposerFromNotification",
  "composer.openInWebForBackgroundComposer",
  "composer.openModeMenu",
  "composer.openModelToggle",
  "composer.openTerminalInWorktree",
  "composer.openVMForBackgroundComposer",
  "composer.previousChatTab",
  "composer.rejectPendingFromNotification",
  "composer.renameChat",
  "composer.reportFeedback",
  "composer.resetMode",
  "composer.resolveAllConflictsInChat",
  "composer.resumeCurrentChat",
  "composer.selectNextComposer",
  "composer.selectNextSubComposerTab",
  "composer.selectPreviousComposer",
  "composer.selectPreviousSubComposerTab",
  "composer.selectSubComposerTab1",
  "composer.selectSubComposerTab2",
  "composer.selectSubComposerTab3",
  "composer.selectSubComposerTab4",
  "composer.selectSubComposerTab5",
  "composer.selectSubComposerTab6",
  "composer.selectSubComposerTab7",
  "composer.selectSubComposerTab8",
  "composer.selectSubComposerTabLast",
  "composer.sendToAgent",
  "composer.shareChat",
  "composer.showBackgroundAgentHistory",
  "composer.showComposerHistory",
  "composer.showComposerHistoryEditor",
  "composer.showViewMenu",
  "composer.skipPendingShellToolDecision",
  "composer.startComposerPrompt",
  "composer.startComposerPrompt2",
  "composer.startComposerPromptFromSelection",
  "composer.testNotification",
  "composer.toggleChatAsEditor",
  "composer.toggleVoiceDictation",
  "composer.triggerCreateWorktreeButton",
  "composer.updateStatus",
  "composer.updateTitle",
] as const;

export type ComposerCommandId = (typeof COMPOSER_COMMAND_IDS)[number];

export const BACKGROUND_COMPOSER_COMMAND_IDS = [
  "workbench.action.backgroundComposer.createNewComposerTab",
  "workbench.action.backgroundComposer.createNewComposerWithPrevContext",
  "workbench.action.backgroundComposer.showBackgroundAgentHistory",
] as const;

export type BackgroundComposerCommandId = (typeof BACKGROUND_COMPOSER_COMMAND_IDS)[number];

export interface ComposerFocusContextKeys {
  composerFocused: boolean;
  agentsPaneFocused: boolean;
  editorTextFocus: boolean;
}

export const COMPOSER_TAB_KEYBINDINGS = [
  {
    command: "composer.selectPreviousComposer",
    key: "Shift+Tab",
    weight: 410,
    when: "(composerFocused || agentsPaneFocused) && !editorTextFocus",
  },
  {
    command: "composer.selectPreviousSubComposerTab",
    key: "Shift+Tab",
    weight: 200,
    when: "composerFocused",
  },
  {
    command: "composer.selectNextComposer",
    key: "Tab",
    weight: 410,
    when: "(composerFocused || agentsPaneFocused) && !editorTextFocus",
  },
  {
    command: "composer.selectNextSubComposerTab",
    key: "Tab",
    weight: 200,
    when: "composerFocused",
  },
] as const;

export function resolveComposerTabCommand(
  shiftKey: boolean,
  context: ComposerFocusContextKeys,
): ComposerCommandId | null {
  if ((context.composerFocused || context.agentsPaneFocused) && !context.editorTextFocus) {
    return shiftKey ? "composer.selectPreviousComposer" : "composer.selectNextComposer";
  }
  if (context.composerFocused) {
    return shiftKey ? "composer.selectPreviousSubComposerTab" : "composer.selectNextSubComposerTab";
  }
  return null;
}
