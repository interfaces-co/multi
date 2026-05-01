import type { Project, Thread } from "~/types";

/** Draft thread fields needed to resolve panel storage cwd. */
export type DraftThreadForPanelCwd = Pick<Thread, "environmentId" | "projectId" | "worktreePath">;

/**
 * Cwd key for persisting left shell rail (thread list) width/open state.
 * Prefer project root over worktree so all threads in a project share one width.
 */
export function resolveShellPanelPersistenceCwd(input: {
  activeDraftThread: DraftThreadForPanelCwd | null;
  draftProjectCwd: string | null;
  activeThread: Thread | null;
  threadProjectCwd: string | null;
  defaultProjectCwd: string | null;
  firstProjectCwd: string | null;
}): string | null {
  if (input.activeDraftThread) {
    return input.draftProjectCwd ?? input.activeDraftThread.worktreePath ?? null;
  }
  if (input.activeThread) {
    return input.threadProjectCwd ?? input.activeThread.worktreePath ?? null;
  }
  return input.defaultProjectCwd ?? input.firstProjectCwd;
}
