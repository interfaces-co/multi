import { scopedProjectKey, scopeProjectRef } from "@multi/client-runtime";
import { DEFAULT_RUNTIME_MODE, type ScopedProjectRef } from "@multi/contracts";
import { useParams, useRouter } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  type DraftThreadEnvMode,
  type DraftThreadState,
  useComposerDraftStore,
} from "../composer-draft-store";
import { newDraftId, newThreadId } from "../lib/utils";
import { orderItemsByPreferredIds } from "../lib/thread-sidebar";
import { findProjectByPath } from "../lib/project-paths";
import { deriveLogicalProjectKey, getProjectOrderKey } from "../logical-project";
import { useServerConfig } from "../rpc/server-state";
import { selectProjectsAcrossEnvironments, useStore } from "../store";
import { createThreadSelectorByRef } from "../store-selectors";
import { resolveThreadRouteTarget } from "../thread-routes";
import { useUiStateStore } from "../ui-state-store";
import { traceBrowserEvent } from "~/observability/browserDebug";

function useNewThreadState() {
  const projects = useStore(useShallow((store) => selectProjectsAcrossEnvironments(store)));
  const router = useRouter();
  const getCurrentRouteTarget = useCallback(() => {
    const currentRouteParams = router.state.matches[router.state.matches.length - 1]?.params ?? {};
    return resolveThreadRouteTarget(currentRouteParams);
  }, [router]);

  return useCallback(
    (
      projectRef: ScopedProjectRef,
      options?: {
        branch?: string | null;
        reuseExistingDraft?: boolean;
        worktreePath?: string | null;
        envMode?: DraftThreadEnvMode;
      },
    ): Promise<void> => {
      const {
        getDraftSessionByLogicalProjectKey,
        getDraftSession,
        getDraftThread,
        applyStickyState,
        setDraftThreadContext,
        setLogicalProjectDraftThreadId,
      } = useComposerDraftStore.getState();
      const currentRouteTarget = getCurrentRouteTarget();
      const project = projects.find(
        (candidate) =>
          candidate.id === projectRef.projectId &&
          candidate.environmentId === projectRef.environmentId,
      );
      const logicalProjectKey = project
        ? deriveLogicalProjectKey(project)
        : scopedProjectKey(projectRef);
      const hasBranchOption = options?.branch !== undefined;
      const hasWorktreePathOption = options?.worktreePath !== undefined;
      const hasEnvModeOption = options?.envMode !== undefined;
      const reuseExistingDraft = options?.reuseExistingDraft !== false;
      const storedDraftThread = getDraftSessionByLogicalProjectKey(logicalProjectKey);
      const latestActiveDraftThread: DraftThreadState | null = currentRouteTarget
        ? currentRouteTarget.kind === "server"
          ? getDraftThread(currentRouteTarget.threadRef)
          : getDraftSession(currentRouteTarget.draftId)
        : null;
      if (reuseExistingDraft && storedDraftThread) {
        return (async () => {
          traceBrowserEvent("thread.new.reuse-stored-draft", {
            draftId: storedDraftThread.draftId,
            threadId: storedDraftThread.threadId,
            logicalProjectKey,
          });
          if (hasBranchOption || hasWorktreePathOption || hasEnvModeOption) {
            setDraftThreadContext(storedDraftThread.draftId, {
              ...(hasBranchOption ? { branch: options?.branch ?? null } : {}),
              ...(hasWorktreePathOption ? { worktreePath: options?.worktreePath ?? null } : {}),
              ...(hasEnvModeOption ? { envMode: options?.envMode } : {}),
            });
          }
          setLogicalProjectDraftThreadId(logicalProjectKey, projectRef, storedDraftThread.draftId, {
            threadId: storedDraftThread.threadId,
          });
          if (
            currentRouteTarget?.kind === "draft" &&
            currentRouteTarget.draftId === storedDraftThread.draftId
          ) {
            return;
          }
          await router.navigate({
            to: "/draft/$draftId",
            params: { draftId: storedDraftThread.draftId },
          });
        })();
      }

      if (
        reuseExistingDraft &&
        latestActiveDraftThread &&
        currentRouteTarget?.kind === "draft" &&
        latestActiveDraftThread.logicalProjectKey === logicalProjectKey &&
        latestActiveDraftThread.promotedTo == null
      ) {
        traceBrowserEvent("thread.new.reuse-active-draft", {
          draftId: currentRouteTarget.draftId,
          threadId: latestActiveDraftThread.threadId,
          logicalProjectKey,
        });
        if (hasBranchOption || hasWorktreePathOption || hasEnvModeOption) {
          setDraftThreadContext(currentRouteTarget.draftId, {
            ...(hasBranchOption ? { branch: options?.branch ?? null } : {}),
            ...(hasWorktreePathOption ? { worktreePath: options?.worktreePath ?? null } : {}),
            ...(hasEnvModeOption ? { envMode: options?.envMode } : {}),
          });
        }
        setLogicalProjectDraftThreadId(logicalProjectKey, projectRef, currentRouteTarget.draftId, {
          threadId: latestActiveDraftThread.threadId,
          createdAt: latestActiveDraftThread.createdAt,
          runtimeMode: latestActiveDraftThread.runtimeMode,
          interactionMode: latestActiveDraftThread.interactionMode,
          ...(hasBranchOption ? { branch: options?.branch ?? null } : {}),
          ...(hasWorktreePathOption ? { worktreePath: options?.worktreePath ?? null } : {}),
          ...(hasEnvModeOption ? { envMode: options?.envMode } : {}),
        });
        return Promise.resolve();
      }

      const draftId = newDraftId();
      const threadId = newThreadId();
      const createdAt = new Date().toISOString();
      return (async () => {
        traceBrowserEvent("thread.new.create-draft", {
          draftId,
          threadId,
          environmentId: projectRef.environmentId,
          projectId: projectRef.projectId,
          logicalProjectKey,
          envMode: options?.envMode ?? "local",
        });
        setLogicalProjectDraftThreadId(logicalProjectKey, projectRef, draftId, {
          threadId,
          createdAt,
          branch: options?.branch ?? null,
          worktreePath: options?.worktreePath ?? null,
          envMode: options?.envMode ?? "local",
          runtimeMode: DEFAULT_RUNTIME_MODE,
        });
        applyStickyState(draftId);

        await router.navigate({
          to: "/draft/$draftId",
          params: { draftId },
        });
        traceBrowserEvent("thread.new.navigate-draft.done", { draftId, threadId });
      })();
    },
    [getCurrentRouteTarget, router, projects],
  );
}

export function useNewThreadHandler() {
  const handleNewThread = useNewThreadState();

  return {
    handleNewThread,
  };
}

export function useHandleNewThread() {
  const projectOrder = useUiStateStore((store) => store.projectOrder);
  const routeTarget = useParams({
    strict: false,
    select: (params) => resolveThreadRouteTarget(params),
  });
  const routeThreadRef = routeTarget?.kind === "server" ? routeTarget.threadRef : null;
  const activeThread = useStore(
    useMemo(() => createThreadSelectorByRef(routeThreadRef), [routeThreadRef]),
  );
  const getDraftThread = useComposerDraftStore((store) => store.getDraftThread);
  const activeDraftThread = useComposerDraftStore(() =>
    routeTarget
      ? routeTarget.kind === "server"
        ? getDraftThread(routeTarget.threadRef)
        : useComposerDraftStore.getState().getDraftSession(routeTarget.draftId)
      : null,
  );
  const projects = useStore(useShallow((store) => selectProjectsAcrossEnvironments(store)));
  const serverConfig = useServerConfig();
  const orderedProjects = useMemo(() => {
    return orderItemsByPreferredIds({
      items: projects,
      preferredIds: projectOrder,
      getId: getProjectOrderKey,
    });
  }, [projectOrder, projects]);
  const defaultProject = useMemo(() => {
    return (
      (serverConfig?.cwd ? findProjectByPath(orderedProjects, serverConfig.cwd) : undefined) ??
      orderedProjects[0] ??
      null
    );
  }, [orderedProjects, serverConfig?.cwd]);
  const handleNewThread = useNewThreadState();

  return {
    activeDraftThread,
    activeThread,
    defaultProjectRef: defaultProject
      ? scopeProjectRef(defaultProject.environmentId, defaultProject.id)
      : null,
    handleNewThread,
    routeThreadRef,
  };
}
