export const GIT_AGENT_ACTIONS = {
  createBranchAndCommit: {
    label: "Create Branch & Commit",
    loadingLabel: "Committing...",
    prompt: "Execute the selected diff-tab create-branch-and-commit action.",
    simulatedReason: "DIFF_TAB_COMMIT",
  },
  createBranchCommitAndPush: {
    label: "Create Branch, Commit & Push",
    loadingLabel: "Committing...",
    prompt: "Execute the selected diff-tab create-branch-commit-and-push action.",
    simulatedReason: "DIFF_TAB_COMMIT_AND_PUSH",
  },
  commit: {
    label: "Commit",
    loadingLabel: "Committing...",
    prompt: "Execute the selected diff-tab commit action.",
    simulatedReason: "DIFF_TAB_COMMIT",
  },
  commitAndPush: {
    label: "Commit & Push",
    loadingLabel: "Committing...",
    prompt: "Execute the selected diff-tab commit-and-push action.",
    simulatedReason: "DIFF_TAB_COMMIT_AND_PUSH",
  },
  createPrWithChanges: {
    label: "Commit & Create PR",
    loadingLabel: "Creating PR...",
    prompt: "Execute the selected diff-tab commit-and-create-pull-request action.",
    simulatedReason: "DIFF_TAB_CREATE_PR",
  },
} as const;

export type GitAgentAction = keyof typeof GIT_AGENT_ACTIONS;

export const GIT_AGENT_PRIMARY_ACTION = "commitAndPush" as const satisfies GitAgentAction;

export const GIT_AGENT_ACTION_ORDER = [
  "createBranchAndCommit",
  "createBranchCommitAndPush",
  "commit",
  "createPrWithChanges",
] as const satisfies readonly GitAgentAction[];
