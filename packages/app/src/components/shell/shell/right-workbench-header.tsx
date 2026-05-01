"use client";

import { Tabs } from "@base-ui/react/tabs";
import { IconSidebarHiddenRightWide } from "central-icons";
import { FileTextIcon, GitBranchIcon, PlusIcon, TerminalIcon, XIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import type { TerminalSessionEntry, WorkbenchTab } from "~/lib/shell-panels-store";
import { cn } from "~/lib/utils";

import { RightWorkbenchToolIsland } from "./right-workbench-tool-island";

const TOOL_META: Record<
  WorkbenchTab,
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  files: { label: "Files", icon: FileTextIcon },
  git: { label: "Changes", icon: GitBranchIcon },
  terminal: { label: "Terminal", icon: TerminalIcon },
};

function ToolIconButton(props: { tab: WorkbenchTab; badge?: string | null }) {
  const meta = TOOL_META[props.tab];
  const Icon = meta.icon;
  const badgeText = props.badge && props.badge !== "0" ? `, ${props.badge}` : "";
  return (
    <Tabs.Tab
      value={props.tab}
      className={(state) =>
        cn(
          "no-drag outline-none focus-visible:outline-none ui-tab-system-tab box-border flex h-(--multi-workbench-chrome-row-height) shrink-0 items-center justify-center rounded-[5px] border-0 px-(--multi-workbench-chrome-icon-padding-x) text-multi-icon-secondary shadow-none transition-colors hover:bg-multi-bg-quaternary hover:text-multi-icon-primary",
          state.active && "bg-multi-bg-tertiary text-multi-icon-primary",
        )
      }
      aria-label={`${meta.label}${badgeText}`}
      title={`${meta.label}${badgeText}`}
    >
      <Icon className="size-3.5" aria-hidden />
    </Tabs.Tab>
  );
}

function WorkbenchTabList(props: { activeTab: WorkbenchTab; gitCount?: number | undefined }) {
  const allTabs: WorkbenchTab[] = ["git", "terminal", "files"];
  return (
    <Tabs.List className="flex shrink-0 items-center gap-(--multi-workbench-chrome-action-gap)">
      {allTabs.map((tab) => (
        <ToolIconButton
          key={tab}
          tab={tab}
          badge={tab === "git" && props.gitCount ? String(props.gitCount) : null}
        />
      ))}
      <div className="sr-only" aria-live="polite">
        {TOOL_META[props.activeTab].label}
      </div>
    </Tabs.List>
  );
}

function WorkbenchChromeButton(props: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="no-drag outline-none focus-visible:outline-none ui-tab-system-tab box-border flex h-(--multi-workbench-chrome-row-height) shrink-0 items-center justify-center rounded-[5px] border-0 px-(--multi-workbench-chrome-icon-padding-x) text-multi-icon-secondary shadow-none transition-colors hover:bg-multi-bg-quaternary hover:text-multi-icon-primary"
      aria-label={props.label}
      title={props.label}
    >
      {props.children}
    </button>
  );
}

function TerminalSessionTab(props: {
  session: TerminalSessionEntry;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
  closable: boolean;
}) {
  return (
    <div
      className={cn(
        "no-drag group relative flex h-[22px] max-w-[var(--composer-tab-label-max-width,200px)] items-center overflow-hidden rounded-[5px] text-[12px]/[16px] transition-colors",
        props.active
          ? "bg-multi-bg-tertiary text-multi-fg-primary"
          : "text-multi-fg-secondary hover:bg-multi-bg-quaternary hover:text-multi-fg-primary",
      )}
    >
      <button
        type="button"
        onClick={props.onActivate}
        className="flex min-w-0 flex-1 items-center gap-1 px-1.5 text-left"
        aria-current={props.active ? "page" : undefined}
      >
        <TerminalIcon className="size-3 shrink-0 opacity-60" aria-hidden />
        <span className="min-w-0 truncate">{props.session.label}</span>
      </button>
      {props.closable ? (
        <button
          type="button"
          aria-label={`Close ${props.session.label}`}
          onClick={(e) => {
            e.stopPropagation();
            props.onClose();
          }}
          className="no-drag mr-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm text-multi-fg-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:text-multi-fg-primary"
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

interface RightWorkbenchHeaderProps {
  activeTab: WorkbenchTab;
  onToggle: () => void;
  gitCount?: number;
  terminalSessions?: TerminalSessionEntry[];
  activeTerminalId?: string;
  onTerminalTab?: (id: string) => void;
  onNewTerminal?: () => void;
  onCloseTerminal?: (id: string) => void;
  trailing?: ReactNode;
}

export function RightWorkbenchHeader(props: RightWorkbenchHeaderProps) {
  const isTerminal = props.activeTab === "terminal";
  const sessions = props.terminalSessions ?? [];
  const showTerminalSessionTabs = isTerminal && sessions.length > 0;

  return (
    <RightWorkbenchToolIsland
      trailing={props.trailing}
      end={
        <button
          type="button"
          onClick={props.onToggle}
          className="no-drag flex h-(--multi-workbench-chrome-row-height) shrink-0 items-center justify-center rounded-[5px] border-0 px-(--multi-workbench-chrome-icon-padding-x) text-multi-icon-secondary shadow-none outline-none transition-colors hover:bg-multi-bg-quaternary hover:text-multi-icon-primary focus-visible:outline-none"
          aria-label="Hide right panel"
          title="Hide right panel"
        >
          <IconSidebarHiddenRightWide className="size-4 shrink-0" />
        </button>
      }
    >
      <>
        <WorkbenchTabList activeTab={props.activeTab} gitCount={props.gitCount} />

        {showTerminalSessionTabs ? (
          <>
            <div
              className="h-[22px] w-px shrink-0 self-center bg-multi-stroke-tertiary"
              aria-hidden
            />
            {sessions.map((session) => (
              <TerminalSessionTab
                key={session.id}
                session={session}
                active={session.id === props.activeTerminalId}
                onActivate={() => props.onTerminalTab?.(session.id)}
                onClose={() => props.onCloseTerminal?.(session.id)}
                closable={sessions.length > 1}
              />
            ))}
          </>
        ) : null}
        {isTerminal && props.onNewTerminal ? (
          <>
            {!showTerminalSessionTabs ? (
              <div
                className="h-[22px] w-px shrink-0 self-center bg-multi-stroke-tertiary"
                aria-hidden
              />
            ) : null}
            <WorkbenchChromeButton label="New terminal" onClick={props.onNewTerminal}>
              <PlusIcon className="size-3.5" aria-hidden />
            </WorkbenchChromeButton>
          </>
        ) : null}

        <div className="editor-panel-tab-bar-spacer min-w-0 flex-1" />
      </>
    </RightWorkbenchToolIsland>
  );
}
