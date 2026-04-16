// @ts-nocheck
"use client";

import type { EnvironmentId } from "@multi/contracts";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { BrowserPanel } from "~/components/BrowserPanel";
import { isElectron } from "~/env";
import { useSidebarAgents } from "~/hooks/use-sidebar-agents";
import { useEnvironmentGitPanel } from "~/hooks/use-environment-git";
import { useShellPanels } from "~/hooks/use-shell-panels";
import { useShellState } from "~/hooks/use-shell-cwd";
import { useChatDraftStore, hasDraft } from "~/lib/chat-draft-store";
import { resolveWorkbenchBrowserThreadId } from "~/lib/workbench-browser-scope";
import { useThreadUnreadStore } from "~/lib/thread-unread-store";
import { switchWorkspace } from "~/lib/workspace-routing";
import { cn } from "~/lib/utils";
import { useDefaultHarness } from "~/lib/harness-picker";
import { useShellLayoutStore } from "~/lib/shell-layout-store";
import { useThreadSummariesStatus } from "~/lib/thread-session-store";
import {
  selectProjectsAcrossEnvironments,
  selectThreadsAcrossEnvironments,
  useStore,
} from "~/store";
import { AppShell } from "./app";
import { CommandPalette } from "./command-palette";
import { WorkbenchPanel } from "./workbench-panel";
import { GitPanel } from "~/components/shell/git/panel";
import { TerminalPanel } from "~/components/shell/terminal/panel";
import { ShellSidebarFooter } from "~/components/shell/sidebar/footer";
import { ShellSidebarHeader } from "~/components/shell/sidebar/header";
import { ThreadRail } from "~/components/shell/sidebar/thread-rail";

export function ChatShellLayout() {
  const navigate = useNavigate();
  const { cwd, home } = useShellState();
  const p = useShellPanels(cwd);
  const { kind } = useDefaultHarness();
  const projects = useStore(useShallow(selectProjectsAcrossEnvironments));
  const sumsStatus = useThreadSummariesStatus();
  const clear = useShellLayoutStore((state) => state.clear);
  const root = useChatDraftStore((state) => state.root);
  const items = useChatDraftStore((state) => state.items);
  const cur = useChatDraftStore((state) => state.cur);
  const pick = useChatDraftStore((state) => state.pick);
  const park = useChatDraftStore((state) => state.park);
  const { sections, routeThreadId, selectedId, selected, loading, error } = useSidebarAgents(
    cwd,
    home,
  );
  const activeEnvironmentId = useStore(
    useMemo(
      () => (state) => {
        const routeThread = routeThreadId
          ? selectThreadsAcrossEnvironments(state).find((thread) => thread.id === routeThreadId)
          : null;
        if (routeThread?.environmentId) {
          return routeThread.environmentId;
        }
        const projects = selectProjectsAcrossEnvironments(state);
        const shellProject = projects.find((project) => project.cwd === cwd) ?? null;
        return shellProject?.environmentId ?? projects[0]?.environmentId ?? null;
      },
      [cwd, routeThreadId],
    ),
  );

  useEffect(() => {
    clear();
  }, [clear, selectedId]);

  useEffect(() => {
    if (!routeThreadId || cur === null) return;
    pick(null);
  }, [cur, pick, routeThreadId]);

  useEffect(() => {
    if (!selected?.cwd) return;
    if (cwd !== null && selected.cwd === cwd) return;

    void switchWorkspace(selected.cwd);
  }, [cwd, selected?.cwd]);

  const title = !selectedId
    ? "New chat"
    : routeThreadId && sumsStatus === "loading"
      ? "Loading chat"
      : routeThreadId && sumsStatus === "error"
        ? "Chat unavailable"
        : selected?.title || "New chat";

  const create = useCallback(
    (next?: string) => {
      void (async () => {
        const base = cwd ?? projects[0]?.cwd ?? null;
        const target = next ?? base;

        if (routeThreadId) {
          pick(null);
          await navigate({ to: "/" });
          if (target && target !== cwd) await switchWorkspace(target);
          return;
        }
        if (cur) {
          pick(null);
          if (target && target !== cwd) await switchWorkspace(target);
          return;
        }
        if (hasDraft(root.text, root.files)) {
          park(cwd ?? projects[0]?.cwd ?? target ?? "/", kind);
        }
        if (target && target !== cwd) await switchWorkspace(target);
      })();
    },
    [cur, cwd, kind, navigate, park, pick, projects, root.files, root.text, routeThreadId],
  );

  const clearThreadUnread = useThreadUnreadStore((s) => s.clear);

  const select = useCallback(
    (id: string) => {
      if (id in items) {
        pick(id);
        void navigate({ to: "/" });
        return;
      }
      clearThreadUnread(id);
      pick(null);
      const thread = useStore.getState().threads.find((entry) => entry.id === id) ?? null;
      if (!thread) {
        void navigate({ to: "/" });
        return;
      }
      void navigate({
        to: "/$environmentId/$threadId",
        params: { environmentId: thread.environmentId, threadId: id },
      });
    },
    [clearThreadUnread, items, navigate, pick],
  );

  const left = (
    <div className="thread-rail-pad flex min-h-0 flex-1 flex-col px-0">
      <div className={cn("shrink-0", isElectron && "no-drag")}>
        <ShellSidebarHeader onNewChat={create} />
      </div>
      <ThreadRail
        loading={loading}
        error={error}
        sections={sections}
        selectedId={selectedId}
        onSelectAgent={select}
        onNewAgent={create}
      />
      <ShellSidebarFooter />
    </div>
  );

  return (
    <>
      <CommandPalette panels={p} onNewChat={create} routeThreadId={routeThreadId} />
      {isElectron ? (
        <DesktopShellLayout
          cwd={cwd}
          left={left}
          title={title}
          routeThreadId={routeThreadId}
          panels={p}
          environmentId={activeEnvironmentId}
        />
      ) : (
        <WebShellLayout left={left} title={title} panels={p} />
      )}
    </>
  );
}

function DesktopShellLayout(props: {
  cwd: string | null;
  left: ReactNode;
  title: string;
  routeThreadId: string | null;
  panels: ReturnType<typeof useShellPanels>;
  environmentId: EnvironmentId | null;
}) {
  const git = useEnvironmentGitPanel(props.environmentId);
  const mute = useShellLayoutStore((state) => state.mute);
  const unmute = useShellLayoutStore((state) => state.unmute);
  const muted = useShellLayoutStore((state) =>
    props.cwd ? Boolean(state.mutes[props.cwd]) : false,
  );
  const autoOpen = Boolean(props.routeThreadId && git.focusId && !muted);
  const rightOpen = props.panels.rightOpen || autoOpen;
  const tab = props.panels.activeTab;
  const browserThreadId = resolveWorkbenchBrowserThreadId(props.cwd);

  return (
    <AppShell
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
      left={props.left}
      center={<Outlet />}
      right={
        <WorkbenchPanel>
          {tab === "git" && <GitPanel git={git} />}
          {tab === "terminal" && (
            <TerminalPanel cwd={props.cwd} environmentId={props.environmentId} />
          )}
          {tab === "browser" && (
            <BrowserPanel
              mode="sidebar"
              threadId={browserThreadId}
              onClosePanel={() => props.panels.toggleRight()}
            />
          )}
        </WorkbenchPanel>
      }
    />
  );
}

function WebShellLayout(props: {
  left: ReactNode;
  title: string;
  panels: ReturnType<typeof useShellPanels>;
}) {
  return (
    <AppShell
      title={props.title}
      changesCount={0}
      panels={props.panels}
      left={props.left}
      center={<Outlet />}
      right={null}
    />
  );
}
