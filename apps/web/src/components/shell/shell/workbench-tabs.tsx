"use client";

import { IconBranch, IconConsole, IconGlobe, IconSidebarHiddenRightWide } from "central-icons";
import type { ComponentType } from "react";

import type { WorkbenchTab } from "~/lib/shell-panels-store";
import { cn } from "~/lib/utils";

interface Tab {
  id: WorkbenchTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: "git", label: "Git", icon: IconBranch },
  { id: "terminal", label: "Terminal", icon: IconConsole },
  { id: "browser", label: "Browser", icon: IconGlobe },
];

export function WorkbenchTabBar(props: {
  active: WorkbenchTab;
  onTab: (tab: WorkbenchTab) => void;
  count: number;
  onToggle: () => void;
}) {
  return (
    <div className="no-drag relative h-(--multi-header-height) shrink-0 border-multi-border/30">
      <div className="absolute inset-x-0 top-(--multi-titlebar-control-row-top) flex items-center gap-0.5 rounded-multi-control p-0.5 pl-2 pr-[calc(var(--multi-workbench-toggle-right)+var(--multi-titlebar-control-height))]">
        {tabs.map((tab) => {
          const selected = tab.id === props.active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => props.onTab(tab.id)}
              className={cn(
                "font-multi sidebar-label-track flex h-(--multi-titlebar-control-height) items-center gap-1 rounded-multi-control px-1.5 leading-none transition-colors [&_svg]:block",
                selected
                  ? "bg-multi-active/60 text-foreground"
                  : "text-muted-foreground/70 hover:bg-multi-hover hover:text-foreground",
              )}
              aria-pressed={selected}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="leading-none">{tab.label}</span>
              {tab.id === "git" && props.count > 0 ? (
                <span className="flex min-w-4 items-center justify-center rounded bg-muted-foreground/20 px-1 py-0.5 leading-none text-inherit tabular-nums">
                  {props.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute top-(--multi-titlebar-control-row-top) right-0 flex pr-(--multi-workbench-toggle-right)">
        <button
          type="button"
          onClick={props.onToggle}
          className="pointer-events-auto no-drag flex h-(--multi-titlebar-control-height) w-(--multi-titlebar-control-height) shrink-0 items-center justify-center rounded-multi-control bg-transparent p-0 leading-none text-muted-foreground/70 [&_svg]:block hover:bg-multi-hover hover:text-foreground"
          aria-label="Collapse panel"
        >
          <IconSidebarHiddenRightWide className="size-4 shrink-0 opacity-60" />
        </button>
      </div>
    </div>
  );
}
