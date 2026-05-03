"use client";

import {
  IconArrowLeft,
  IconSidebar,
  IconSidebarHiddenLeftWide,
  IconSidebarHiddenRightWide,
} from "central-icons";
import { TabsPanel, TabsRoot } from "@multi/ui/tabs";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef } from "react";

import { isElectron, isElectronHost } from "~/env";
import {
  type WorkbenchTab,
  RIGHT_WORKBENCH_WIDTH_LIMITS,
  SHELL_LEFT_PANEL_WIDTH_LIMITS,
  shellPanelsActions,
  useActiveTab,
  useIsMuted,
  useLeftOpen,
  useLeftWidth,
  useRightOpen,
  useRightWidth,
  useTerminalSessions,
} from "~/lib/shell-panels-store";
import { cn } from "~/lib/utils";
import { RightWorkbenchHeader } from "./right-workbench-header";
import { useColumnResize } from "./use-column-resize";

const chatLayoutRouteApi = getRouteApi("/_chat");

const LEFT_LIMITS = SHELL_LEFT_PANEL_WIDTH_LIMITS;
const RIGHT_LIMITS = RIGHT_WORKBENCH_WIDTH_LIMITS;
const WORKBENCH_TABS = ["git", "terminal", "files"] satisfies readonly WorkbenchTab[];

const workbenchPanelSlotVariants = cva(
  "absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden",
  {
    variants: {
      active: {
        false: "pointer-events-none invisible opacity-0",
        true: "visible opacity-100",
      },
    },
  },
);

function isWorkbenchTab(value: unknown): value is WorkbenchTab {
  return value === "git" || value === "terminal" || value === "files";
}

type RightPanels = Record<WorkbenchTab, ReactNode>;

export interface AppShellPanels {
  leftOpen: boolean;
  rightOpen: boolean;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (open: boolean) => void;
  leftW: number;
  rightW: number;
  toggleLeft: () => void;
  toggleRight: () => void;
  setLeftWidth: (n: number) => void;
  setRightWidth: (n: number) => void;
  activeTab: WorkbenchTab;
  setActiveTab: (tab: WorkbenchTab) => void;
}

function resolveEffectiveRightOpen(input: {
  storedRightOpen: boolean;
  routeThreadId: string | null;
  gitFocusId: string | null;
  muted: boolean;
}): boolean {
  return input.storedRightOpen || Boolean(input.routeThreadId && input.gitFocusId && !input.muted);
}

function setRightPanelOpen(cwd: string | null, open: boolean): void {
  shellPanelsActions.setRightOpen(cwd, open);
  shellPanelsActions.setMuted(cwd, !open);
}

const SHOW_RIGHT_WORKBENCH_LABEL = "Show workspace panel — files, Git changes, terminal.";

function LeftAside(props: { children: ReactNode }) {
  const leftOpen = useLeftOpen();
  const leftWidth = useLeftWidth();
  const asideRef = useRef<HTMLElement | null>(null);
  const resize = useColumnResize({
    width: leftWidth,
    limits: LEFT_LIMITS,
    elementRef: asideRef,
    direction: "right",
    onCommit: (nextWidth) => shellPanelsActions.setLeftWidth(nextWidth),
  });

  return (
    <aside
      className={cn(
        "agent-window__sidebar multi-shell-sidebar relative flex shrink-0 flex-col overflow-hidden",
        resize.dragging
          ? "transition-none"
          : "transition-[width] duration-150 ease-out motion-reduce:transition-none",
      )}
      data-agent-window-sidebar=""
      data-shell-left-expanded={leftOpen ? "true" : "false"}
      ref={asideRef}
      style={{
        width: leftOpen ? leftWidth : 0,
        borderRightWidth: 0,
      }}
    >
      <div
        aria-hidden={!leftOpen}
        className={cn(
          "flex h-full min-h-0 w-full flex-col transition-opacity duration-150 ease-out motion-reduce:transition-none",
          leftOpen ? "opacity-100" : "opacity-0",
        )}
      >
        {props.children}
      </div>
      {leftOpen ? (
        <div
          aria-label="Resize thread sidebar"
          aria-orientation="vertical"
          className={cn(
            "multi-shell-sash-hit-area multi-shell-sash-hit-area--align-end pointer-events-auto",
            resize.dragging ? "multi-shell-sash-hit-area--active" : null,
          )}
          {...resize.sashProps}
          role="separator"
        >
          <div aria-hidden className="multi-shell-sash-hit-feedback" />
        </div>
      ) : null}
    </aside>
  );
}

function RightAsideHeader(props: {
  cwd: string | null;
  changesCount: number;
  activeTab: WorkbenchTab;
}) {
  const terminalState = useTerminalSessions(props.cwd);

  return (
    <RightWorkbenchHeader
      activeTab={props.activeTab}
      gitCount={props.changesCount}
      terminalSessions={terminalState.sessions}
      activeTerminalId={terminalState.activeId}
      onTerminalTab={(id) => shellPanelsActions.setActiveTerminal(props.cwd, id)}
      onNewTerminal={() => {
        const id = `term-${Date.now()}`;
        shellPanelsActions.addTerminalSession(props.cwd, {
          id,
          label: `Terminal ${terminalState.sessions.length + 1}`,
        });
      }}
      onCloseTerminal={(id) => shellPanelsActions.removeTerminalSession(props.cwd, id)}
    />
  );
}

function RightAside(props: {
  cwd: string | null;
  panelPersistenceCwd: string | null;
  changesCount: number;
  rightPanels: RightPanels;
  routeThreadId: string | null;
  gitFocusId: string | null;
}) {
  const storedRightOpen = useRightOpen(props.panelPersistenceCwd);
  const rightWidth = useRightWidth(props.panelPersistenceCwd);
  const activeTab = useActiveTab(props.panelPersistenceCwd);
  const muted = useIsMuted(props.panelPersistenceCwd);
  const search = chatLayoutRouteApi.useSearch();
  const navigate = useNavigate();
  const rightOpen = resolveEffectiveRightOpen({
    storedRightOpen,
    routeThreadId: props.routeThreadId,
    gitFocusId: props.gitFocusId,
    muted,
  });

  useEffect(() => {
    if (!isElectronHost()) {
      return;
    }
    const w = search.workbench;
    if (w === undefined) {
      return;
    }
    if (w !== activeTab) {
      shellPanelsActions.setActiveTab(props.panelPersistenceCwd, w);
    }
  }, [search.workbench, activeTab, props.panelPersistenceCwd]);

  const handleWorkbenchTabChange = useCallback(
    (value: unknown) => {
      if (!isWorkbenchTab(value)) {
        return;
      }
      shellPanelsActions.setActiveTab(props.panelPersistenceCwd, value);
      shellPanelsActions.setMuted(props.panelPersistenceCwd, false);
      if (isElectron) {
        navigate({
          to: ".",
          search: {
            ...search,
            workbench: value,
          },
          replace: true,
        });
      }
    },
    [navigate, props.panelPersistenceCwd, search],
  );

  const asideRef = useRef<HTMLElement | null>(null);
  const resize = useColumnResize({
    width: rightWidth,
    limits: RIGHT_LIMITS,
    elementRef: asideRef,
    direction: "left",
    onCommit: (nextWidth) => shellPanelsActions.setRightWidth(props.panelPersistenceCwd, nextWidth),
  });

  return (
    <aside
      className={cn(
        "agent-window__workbench editor-panel-container multi-shell-surface relative flex min-w-0 shrink-0 flex-col overflow-hidden",
        resize.dragging
          ? "transition-none"
          : "transition-[width] duration-100 ease-[cubic-bezier(0.19,1,0.22,1)] motion-reduce:transition-none",
      )}
      data-agent-window-workbench=""
      ref={asideRef}
      style={{
        width: rightOpen ? rightWidth : 0,
        minWidth: rightOpen ? RIGHT_LIMITS.min : 0,
        maxWidth: RIGHT_LIMITS.max,
        borderLeftWidth: 0,
      }}
      aria-hidden={!rightOpen ? true : undefined}
    >
      {rightOpen ? (
        <>
          <TabsRoot
            value={activeTab}
            onValueChange={handleWorkbenchTabChange}
            className="editor-panel-inner flex h-full min-h-0 w-full flex-col opacity-100"
          >
            <RightAsideHeader
              cwd={props.cwd}
              changesCount={props.changesCount}
              activeTab={activeTab}
            />
            <RightAsidePanels activeTab={activeTab} rightPanels={props.rightPanels} />
          </TabsRoot>
          <div
            aria-label="Resize workspace panel width"
            aria-orientation="vertical"
            className={cn(
              "multi-shell-sash-hit-area multi-shell-sash-hit-area--align-start pointer-events-auto",
              resize.dragging ? "multi-shell-sash-hit-area--active" : null,
            )}
            {...resize.sashProps}
            role="separator"
          >
            <div aria-hidden className="multi-shell-sash-hit-feedback" />
          </div>
        </>
      ) : null}
    </aside>
  );
}

function RightAsidePanels(props: { activeTab: WorkbenchTab; rightPanels: RightPanels }) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
      {WORKBENCH_TABS.map((tab) => {
        return (
          <TabsPanel
            key={tab}
            value={tab}
            keepMounted
            className={(state) => workbenchPanelSlotVariants({ active: !state.hidden })}
            data-workbench-panel={tab}
            data-workbench-panel-active={tab === props.activeTab ? "true" : "false"}
          >
            {props.rightPanels[tab]}
          </TabsPanel>
        );
      })}
    </div>
  );
}

function ElectronHeaderControls(props: {
  rightPanelPersistenceCwd: string | null;
  showRight: boolean;
  onBack?: () => void;
  routeThreadId: string | null;
  gitFocusId: string | null;
}) {
  const leftOpen = useLeftOpen();
  const storedRightOpen = useRightOpen(props.rightPanelPersistenceCwd);
  const muted = useIsMuted(props.rightPanelPersistenceCwd);
  const rightWidth = useRightWidth(props.rightPanelPersistenceCwd);
  const rightOpen = resolveEffectiveRightOpen({
    storedRightOpen,
    routeThreadId: props.routeThreadId,
    gitFocusId: props.gitFocusId,
    muted,
  });

  const dragFillerMarginRight = props.showRight ? (rightOpen ? rightWidth : 0) : undefined;

  return (
    <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 box-border flex h-(--multi-header-height) min-w-0 items-start">
      <div className="pointer-events-auto no-drag flex shrink-0 items-center gap-1 self-start pl-(--multi-electron-traffic-inset) pt-(--multi-titlebar-control-row-top)">
        {props.onBack ? (
          <button
            type="button"
            onClick={() => props.onBack?.()}
            className="flex h-(--multi-titlebar-control-height) w-(--multi-titlebar-control-height) shrink-0 items-center justify-center rounded-multi-control bg-transparent p-0 leading-none text-muted-foreground [&_svg]:block hover:bg-multi-hover hover:text-foreground"
            aria-label="Back to chat"
          >
            <IconArrowLeft className="size-4 shrink-0" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => shellPanelsActions.toggleLeft()}
          className="flex h-(--multi-titlebar-control-height) w-(--multi-titlebar-control-height) shrink-0 items-center justify-center rounded-multi-control bg-transparent p-0 leading-none text-muted-foreground [&_svg]:block hover:bg-multi-hover hover:text-foreground"
          aria-label={leftOpen ? "Collapse chats" : "Expand chats"}
        >
          {leftOpen ? (
            <IconSidebarHiddenLeftWide className="size-4 shrink-0" />
          ) : (
            <IconSidebar className="size-4 shrink-0" />
          )}
        </button>
      </div>
      <div
        className="pointer-events-auto drag-region isolate min-h-0 min-w-0 flex-1 self-stretch"
        style={dragFillerMarginRight != null ? { marginRight: dragFillerMarginRight } : undefined}
        aria-hidden
      />
    </div>
  );
}

function RightPanelChromeToggle(props: {
  panelPersistenceCwd: string | null;
  showRight: boolean;
  routeThreadId: string | null;
  gitFocusId: string | null;
  electron: boolean;
}) {
  const storedRightOpen = useRightOpen(props.panelPersistenceCwd);
  const muted = useIsMuted(props.panelPersistenceCwd);
  const rightOpen = props.showRight
    ? resolveEffectiveRightOpen({
        storedRightOpen,
        routeThreadId: props.routeThreadId,
        gitFocusId: props.gitFocusId,
        muted,
      })
    : false;

  if (!props.showRight) {
    return null;
  }

  const label = rightOpen ? "Hide workspace panel" : SHOW_RIGHT_WORKBENCH_LABEL;

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-2 z-30 wco:right-[calc(100vw-env(titlebar-area-width)-env(titlebar-area-x)+0.5rem)]",
        props.electron ? "top-(--multi-titlebar-control-row-top)" : "top-2",
      )}
    >
      <button
        type="button"
        onClick={() => setRightPanelOpen(props.panelPersistenceCwd, !rightOpen)}
        className={cn(
          "pointer-events-auto no-drag flex shrink-0 items-center justify-center rounded-multi-control bg-transparent p-0 leading-none text-muted-foreground [&_svg]:block hover:bg-multi-hover hover:text-foreground",
          props.electron
            ? "h-(--multi-titlebar-control-height) w-(--multi-titlebar-control-height)"
            : "size-7 bg-multi-sidebar/80 shadow-sm backdrop-blur-sm",
        )}
        aria-label={label}
        aria-pressed={rightOpen}
        title={label}
      >
        {rightOpen ? (
          <IconSidebarHiddenRightWide className="size-4 shrink-0" />
        ) : (
          <IconSidebar className="size-4 shrink-0" />
        )}
      </button>
    </div>
  );
}

function LeftExpandButton() {
  const leftOpen = useLeftOpen();
  if (leftOpen) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute top-2 left-2 z-10">
      <button
        type="button"
        onClick={() => shellPanelsActions.toggleLeft()}
        className="pointer-events-auto flex size-7 items-center justify-center rounded-multi-control bg-multi-sidebar/80 text-muted-foreground shadow-sm backdrop-blur-sm [&_svg]:block hover:bg-multi-hover hover:text-foreground"
        aria-label="Expand chats"
      >
        <IconSidebar className="size-4 shrink-0" />
      </button>
    </div>
  );
}

export function AppShell(props: {
  cwd: string | null;
  /** Keys shell chrome width/open state in localStorage; prefer project root over worktree. */
  panelPersistenceCwd?: string | null;
  left: ReactNode;
  center: ReactNode;
  right: RightPanels | null;
  changesCount: number;
  routeThreadId?: string | null;
  gitFocusId?: string | null;
  onBack?: () => void;
}) {
  const electron = isElectronHost();
  const showRight = props.right !== null;
  const panelPersistenceCwd = props.panelPersistenceCwd ?? props.cwd;
  const storedRightOpen = useRightOpen(panelPersistenceCwd);
  const rightWidth = useRightWidth(panelPersistenceCwd);
  const muted = useIsMuted(panelPersistenceCwd);
  const shellRightOpen =
    showRight &&
    resolveEffectiveRightOpen({
      storedRightOpen,
      routeThreadId: props.routeThreadId ?? null,
      gitFocusId: props.gitFocusId ?? null,
      muted,
    });

  useEffect(() => {
    const previousValue = document.body.getAttribute("data-cursor-glass-mode");
    document.body.setAttribute("data-cursor-glass-mode", "true");
    return () => {
      if (previousValue === null) {
        document.body.removeAttribute("data-cursor-glass-mode");
      } else {
        document.body.setAttribute("data-cursor-glass-mode", previousValue);
      }
    };
  }, []);

  return (
    <div
      className="agent-window relative flex h-full min-w-0 flex-1 flex-row bg-transparent"
      data-component="root"
      data-agent-window=""
      data-shell-right-panel={showRight ? "true" : "false"}
      data-shell-right-open={shellRightOpen ? "true" : "false"}
      style={
        showRight
          ? ({
              "--multi-shell-right-workbench-width": shellRightOpen ? `${rightWidth}px` : "0px",
            } as CSSProperties)
          : undefined
      }
    >
      <LeftAside>{props.left}</LeftAside>

      <div className="agent-window__body flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 flex-row">
          <main
            className="agent-panel agent-window__agent-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-multi-chat outline-hidden"
            data-component="agent-panel"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden outline-hidden">
              {props.center}
            </div>
          </main>

          {showRight && props.right ? (
            <RightAside
              cwd={props.cwd}
              panelPersistenceCwd={panelPersistenceCwd}
              changesCount={props.changesCount}
              rightPanels={props.right}
              routeThreadId={props.routeThreadId ?? null}
              gitFocusId={props.gitFocusId ?? null}
            />
          ) : null}
        </div>
      </div>

      {electron ? (
        <ElectronHeaderControls
          rightPanelPersistenceCwd={panelPersistenceCwd}
          showRight={showRight}
          routeThreadId={props.routeThreadId ?? null}
          gitFocusId={props.gitFocusId ?? null}
          {...(props.onBack ? { onBack: props.onBack } : {})}
        />
      ) : (
        <LeftExpandButton />
      )}
      <RightPanelChromeToggle
        panelPersistenceCwd={panelPersistenceCwd}
        showRight={showRight}
        routeThreadId={props.routeThreadId ?? null}
        gitFocusId={props.gitFocusId ?? null}
        electron={electron}
      />
    </div>
  );
}
