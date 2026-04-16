import type { EnvironmentId } from "@multi/contracts";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { BrowserPanel } from "~/components/browser-panel";
import { useCommandPaletteStore } from "~/command-palette-store";
import { isElectron } from "~/env";
import { useEnvironmentGitPanel } from "~/hooks/use-environment-git";
import { useRouteThreadId } from "~/hooks/use-route-thread-id";
import { useChatDraftStore, hasDraft } from "~/lib/chat-draft-store";
import type { ChatDraftSnapshot } from "~/lib/chat-draft-store";
import { shellPanelsActions } from "~/lib/shell-panels-store";
import { useThreadUnreadStore } from "~/lib/thread-unread-store";
import { type SessionListSummary } from "~/lib/ui-session-types";
import { writeStoredWorkspaceCwd } from "~/lib/workspace-state";
import { resolveWorkbenchBrowserThreadId } from "~/lib/workbench-browser-scope";
import { buildWorkspaceChatSections } from "~/lib/sidebar-chat-view-model";
import { cn } from "~/lib/utils";
import {
  selectProjectsAcrossEnvironments,
  selectThreadsAcrossEnvironments,
  useStore,
} from "~/store";
import type { Project, Thread } from "~/types";
import { GitPanel } from "./shell/git/panel";
import { AppShell } from "./shell/shell/app";
import { WorkbenchPanel } from "./shell/shell/workbench-panel";
import { ShellSettingsProvider } from "./shell/settings/context";
import { SettingsNavRail } from "./shell/settings/nav-rail";
import { ShellSidebarFooter } from "./shell/sidebar/footer";
import { ShellSidebarHeader } from "./shell/sidebar/header";
import { ThreadRail } from "./shell/sidebar/thread-rail";
import { TerminalPanel } from "./shell/terminal/panel";

function toHarness(provider: Thread["modelSelection"]["provider"]): "codex" | "claudeCode" {
  return provider === "claudeAgent" ? "claudeCode" : "codex";
}

function toSummary(thread: Thread, project: Project | undefined): SessionListSummary {
  const firstUserMessage = thread.messages.find((message) => message.role === "user")?.text?.trim();
  const cwd = thread.worktreePath ?? project?.cwd ?? "";
  return {
    id: thread.id,
    harness: toHarness(thread.modelSelection.provider),
    path: cwd,
    cwd,
    name: thread.title,
    createdAt: thread.createdAt,
    modifiedAt: thread.updatedAt ?? thread.createdAt,
    messageCount: thread.messages.length,
    firstMessage: firstUserMessage || thread.title,
    allMessagesText: thread.messages.map((message) => message.text).join("\n\n"),
    isStreaming:
      thread.session?.orchestrationStatus === "starting" ||
      thread.session?.orchestrationStatus === "running",
  };
}

export function ShellHost(props: { children?: ReactNode; mode: "chat" | "settings" }) {
  return (
    <ShellSettingsProvider>
      {props.mode === "settings" ? (
        <SettingsShellHost>{props.children}</SettingsShellHost>
      ) : (
        <ChatShellHost>{props.children}</ChatShellHost>
      )}
    </ShellSettingsProvider>
  );
}

function SettingsShellHost(props: { children?: ReactNode }) {
  const navigate = useNavigate();
  const firstProjectCwd = useStore(
    (store) => selectProjectsAcrossEnvironments(store)[0]?.cwd ?? null,
  );

  const settingsLeft = (
    <div className="thread-rail-pad flex min-h-0 flex-1 flex-col px-0">
      <SettingsNavRail />
      <ShellSidebarFooter settings />
    </div>
  );

  return (
    <AppShell
      cwd={firstProjectCwd}
      changesCount={0}
      onBack={() => void navigate({ to: "/" })}
      left={settingsLeft}
      center={props.children ?? <Outlet />}
      right={null}
    />
  );
}

function ChatShellHost(props: { children?: ReactNode }) {
  const navigate = useNavigate();
  const openAddProject = useCommandPaletteStore((store) => store.openAddProject);
  const routeThreadId = useRouteThreadId();
  const projects = useStore(useShallow(selectProjectsAcrossEnvironments));
  const threads = useStore(useShallow(selectThreadsAcrossEnvironments));
  const firstProjectCwd = projects[0]?.cwd ?? null;

  const root = useChatDraftStore((store) => store.root);
  const items = useChatDraftStore((store) => store.items);
  const cur = useChatDraftStore((store) => store.cur);
  const pick = useChatDraftStore((store) => store.pick);
  const park = useChatDraftStore((store) => store.park);
  const drafts = useMemo(() => Object.values(items) as ChatDraftSnapshot[], [items]);
  const unread = useThreadUnreadStore((store) => store.unread);

  const selectedId = routeThreadId ?? cur;

  const projectById = useMemo(
    () =>
      new Map<Project["id"], Project>(projects.map((project: Project) => [project.id, project])),
    [projects],
  );

  const summaries = useMemo(() => {
    return Object.fromEntries(
      threads
        .filter((thread: Thread) => thread.archivedAt === null)
        .map((thread: Thread) => [thread.id, toSummary(thread, projectById.get(thread.projectId))]),
    ) as Record<string, SessionListSummary>;
  }, [projectById, threads]);

  const unreadIds = useMemo(
    () => new Set(Object.keys(unread).filter((id) => unread[id])),
    [unread],
  );

  const activeThread = useMemo(
    () =>
      routeThreadId
        ? (threads.find((thread: Thread) => thread.id === routeThreadId) ?? null)
        : null,
    [routeThreadId, threads],
  );
  const activeDraft = useMemo(() => (cur ? (items[cur] ?? null) : null), [cur, items]);
  const activeCwd =
    activeDraft?.cwd ??
    (activeThread
      ? (activeThread.worktreePath ?? projectById.get(activeThread.projectId)?.cwd ?? null)
      : firstProjectCwd);
  const activeEnvironmentId =
    activeThread?.environmentId ??
    projects.find((project) => project.cwd === activeCwd)?.environmentId ??
    projects[0]?.environmentId ??
    null;

  const sections = useMemo(
    () => buildWorkspaceChatSections(summaries, drafts, activeCwd, null, unreadIds),
    [activeCwd, drafts, summaries, unreadIds],
  );

  useEffect(() => {
    if (!routeThreadId || cur === null) return;
    pick(null);
  }, [cur, pick, routeThreadId]);

  const create = useCallback(() => {
    if (routeThreadId) {
      pick(null);
      void navigate({ to: "/" });
      return;
    }
    if (cur) {
      pick(null);
      return;
    }
    if (hasDraft(root.text, root.files)) {
      park(activeCwd ?? firstProjectCwd ?? "/", "codex");
    }
  }, [activeCwd, cur, firstProjectCwd, navigate, park, pick, root.files, root.text, routeThreadId]);

  const clearThreadUnread = useThreadUnreadStore((store) => store.clear);

  const select = useCallback(
    (id: string) => {
      if (id in items) {
        const draft = items[id];
        if (draft?.cwd) {
          writeStoredWorkspaceCwd(draft.cwd);
        }
        pick(id);
        void navigate({ to: "/" });
        return;
      }
      clearThreadUnread(id);
      pick(null);
      const thread = threads.find((entry: Thread) => entry.id === id);
      if (thread) {
        const cwd = thread.worktreePath ?? projectById.get(thread.projectId)?.cwd;
        if (cwd) {
          writeStoredWorkspaceCwd(cwd);
        }
        void navigate({
          to: "/$environmentId/$threadId",
          params: { environmentId: thread.environmentId, threadId: id },
        });
      }
    },
    [clearThreadUnread, items, navigate, pick, projectById, threads],
  );

  const chatLeft = (
    <div className="thread-rail-pad flex min-h-0 flex-1 flex-col px-0">
      <div className={cn("shrink-0", isElectron && "no-drag")}>
        <ShellSidebarHeader
          onNewChat={create}
          onAddProject={openAddProject}
          {...(isElectron ? {} : { onCollapse: () => shellPanelsActions.toggleLeft(activeCwd) })}
        />
      </div>
      <ThreadRail
        loading={false}
        error={false}
        sections={sections}
        selectedId={selectedId}
        onSelectAgent={select}
        onNewAgent={create}
      />
      <ShellSidebarFooter />
    </div>
  );

  if (isElectron) {
    return (
      <DesktopChatShellHost
        left={chatLeft}
        center={props.children ?? <Outlet />}
        routeThreadId={routeThreadId}
        cwd={activeCwd}
        environmentId={activeEnvironmentId}
      />
    );
  }

  return (
    <AppShell
      cwd={activeCwd}
      changesCount={0}
      left={chatLeft}
      center={props.children ?? <Outlet />}
      right={null}
    />
  );
}

function DesktopChatShellHost(props: {
  left: ReactNode;
  center: ReactNode;
  routeThreadId: string | null;
  cwd: string | null;
  environmentId: EnvironmentId | null;
}) {
  const git = useEnvironmentGitPanel(props.environmentId);
  const browserThreadId = resolveWorkbenchBrowserThreadId(props.cwd);

  return (
    <AppShell
      cwd={props.cwd}
      changesCount={git.count}
      routeThreadId={props.routeThreadId}
      gitFocusId={git.focusId}
      left={props.left}
      center={props.center}
      right={{
        git: (
          <WorkbenchPanel>
            <GitPanel git={git} />
          </WorkbenchPanel>
        ),
        terminal: (
          <WorkbenchPanel>
            <TerminalPanel cwd={props.cwd} environmentId={props.environmentId} />
          </WorkbenchPanel>
        ),
        browser: (
          <WorkbenchPanel>
            <BrowserPanel
              mode="sidebar"
              threadId={browserThreadId}
              onClosePanel={() => {
                setRightPanelOpen(props.cwd, false);
              }}
            />
          </WorkbenchPanel>
        ),
      }}
    />
  );
}

function setRightPanelOpen(cwd: string | null, open: boolean): void {
  shellPanelsActions.setRightOpen(cwd, open);
  shellPanelsActions.setMuted(cwd, !open);
}
