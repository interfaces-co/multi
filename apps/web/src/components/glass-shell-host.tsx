import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { isElectron } from "~/env";
import { useGlassGitPanel } from "~/hooks/use-glass-git";
import { useGlassShellPanels } from "~/hooks/use-glass-shell-panels";
import { useRouteThreadId } from "~/hooks/use-route-thread-id";
import { useGlassChatDraftStore, hasDraft } from "~/lib/glass-chat-draft-store";
import type { GlassDraftChat } from "~/lib/glass-chat-draft-store";
import { useGlassShellStore } from "~/lib/glass-shell-store";
import { useGlassThreadUnreadStore } from "~/lib/glass-thread-unread-store";
import { type GlassSessionSummary } from "~/lib/glass-types";
import { buildWorkspaceChatSections } from "~/lib/glass-view-model";
import { cn } from "~/lib/utils";
import {
  selectProjectsAcrossEnvironments,
  selectThreadsAcrossEnvironments,
  useStore,
} from "~/store";
import type { Project, Thread } from "~/types";
import { GlassAppShell, type GlassAppShellPanels } from "./glass/shell/app";
import { GlassGitPanel } from "./glass/git/panel";
import { GlassSidebarFooter } from "./glass/sidebar/footer";
import { GlassSidebarHeader } from "./glass/sidebar/header";
import { GlassThreadRail } from "./glass/sidebar/thread-rail";
import { GlassSettingsProvider } from "./glass/settings/context";
import { GlassSettingsNavRail } from "./glass/settings/nav-rail";
import { GlassTerminalPanel } from "./glass/terminal/panel";
import { PlaceholderPanel, WorkbenchPanel } from "./glass/shell/workbench-panel";

function toHarness(provider: Thread["modelSelection"]["provider"]): "codex" | "claudeCode" {
  return provider === "claudeAgent" ? "claudeCode" : "codex";
}

function toSummary(thread: Thread, project: Project | undefined): GlassSessionSummary {
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

export function GlassShellHost({ children }: { children?: ReactNode }) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const navigate = useNavigate();
  const isSettings = pathname.startsWith("/settings");
  const routeThreadId = useRouteThreadId();
  const projects = useStore(useShallow(selectProjectsAcrossEnvironments));
  const threads = useStore(useShallow(selectThreadsAcrossEnvironments));
  const firstProjectCwd = projects[0]?.cwd ?? null;

  const p = useGlassShellPanels(firstProjectCwd);

  const root = useGlassChatDraftStore((s) => s.root);
  const items = useGlassChatDraftStore((s) => s.items);
  const cur = useGlassChatDraftStore((s) => s.cur);
  const pick = useGlassChatDraftStore((s) => s.pick);
  const park = useGlassChatDraftStore((s) => s.park);
  const drafts = useMemo(() => Object.values(items) as GlassDraftChat[], [items]);
  const unread = useGlassThreadUnreadStore((s) => s.unread);

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
    ) as Record<string, GlassSessionSummary>;
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

  const sections = useMemo(
    () => buildWorkspaceChatSections(summaries, drafts, activeCwd, null, unreadIds),
    [activeCwd, drafts, summaries, unreadIds],
  );

  const selected = useMemo(
    () =>
      selectedId
        ? (sections.flatMap((section) => section.items).find((item) => item.id === selectedId) ??
          null)
        : null,
    [sections, selectedId],
  );

  useEffect(() => {
    if (!routeThreadId || cur === null) return;
    pick(null);
  }, [cur, pick, routeThreadId]);

  const title = !selectedId ? "New chat" : selected?.title || "New chat";

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
      park(firstProjectCwd ?? "/", "codex");
    }
  }, [cur, firstProjectCwd, navigate, park, pick, root.files, root.text, routeThreadId]);

  const clearThreadUnread = useGlassThreadUnreadStore((s) => s.clear);

  const select = useCallback(
    (id: string) => {
      if (id in items) {
        pick(id);
        void navigate({ to: "/" });
        return;
      }
      clearThreadUnread(id);
      pick(null);
      const thread = threads.find((entry: Thread) => entry.id === id);
      if (thread) {
        void navigate({
          to: "/$environmentId/$threadId",
          params: { environmentId: thread.environmentId, threadId: id },
        });
      }
    },
    [clearThreadUnread, items, navigate, pick, threads],
  );

  const chatLeft = (
    <div className="glass-thread-rail-pad flex min-h-0 flex-1 flex-col px-0">
      <div className={cn("shrink-0", isElectron && "no-drag")}>
        <GlassSidebarHeader onNewChat={create} onCollapse={p.toggleLeft} />
      </div>
      <GlassThreadRail
        loading={false}
        error={false}
        sections={sections}
        selectedId={selectedId}
        onSelectAgent={select}
        onNewAgent={create}
      />
      <GlassSidebarFooter />
    </div>
  );

  const settingsLeft = (
    <div className="glass-thread-rail-pad flex min-h-0 flex-1 flex-col px-0">
      <GlassSettingsNavRail />
      <GlassSidebarFooter settings />
    </div>
  );

  if (isElectron) {
    return (
      <GlassSettingsProvider>
        <GlassDesktopShellHost
          panels={p}
          title={isSettings ? "Settings" : title}
          isSettings={isSettings}
          {...(isSettings ? { onBack: () => void navigate({ to: "/" }) } : {})}
          left={isSettings ? settingsLeft : chatLeft}
          center={children ?? <Outlet />}
          routeThreadId={routeThreadId}
          cwd={activeCwd}
        />
      </GlassSettingsProvider>
    );
  }

  return (
    <GlassSettingsProvider>
      <GlassAppShell
        title={isSettings ? "Settings" : title}
        changesCount={0}
        panels={p}
        {...(isSettings ? { onBack: () => void navigate({ to: "/" }) } : {})}
        left={isSettings ? settingsLeft : chatLeft}
        center={children ?? <Outlet />}
        right={null}
      />
    </GlassSettingsProvider>
  );
}

function GlassDesktopShellHost(props: {
  panels: GlassAppShellPanels;
  title: string;
  isSettings: boolean;
  onBack?: () => void;
  left: ReactNode;
  center: ReactNode;
  routeThreadId: string | null;
  cwd: string | null;
}) {
  const git = useGlassGitPanel();
  const mute = useGlassShellStore((state) => state.mute);
  const unmute = useGlassShellStore((state) => state.unmute);
  const muted = useGlassShellStore((state) =>
    props.cwd ? Boolean(state.mutes[props.cwd]) : false,
  );
  const autoOpen = Boolean(props.routeThreadId && git.focusId && !muted);
  const rightOpen = props.panels.rightOpen || autoOpen;
  const tab = props.panels.activeTab;

  return (
    <GlassAppShell
      title={props.title}
      changesCount={git.count}
      panels={{
        ...props.panels,
        rightOpen,
        setRightOpen: (open) => {
          if (props.cwd) {
            if (open) unmute(props.cwd);
            if (!open) mute(props.cwd);
          }
          props.panels.setRightOpen(open);
        },
        toggleRight: () => {
          const next = !rightOpen;
          if (props.cwd) {
            if (next) unmute(props.cwd);
            if (!next) mute(props.cwd);
          }
          props.panels.setRightOpen(next);
        },
      }}
      {...(props.onBack ? { onBack: props.onBack } : {})}
      left={props.left}
      center={props.center}
      right={
        <WorkbenchPanel>
          {tab === "git" && <GlassGitPanel git={git} />}
          {tab === "terminal" && <GlassTerminalPanel cwd={props.cwd} />}
          {tab === "web" && <PlaceholderPanel label="Web" />}
          {tab === "files" && <PlaceholderPanel label="Files" />}
        </WorkbenchPanel>
      }
    />
  );
}
