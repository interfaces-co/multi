"use client";

import { Menu } from "@base-ui/react/menu";
import {
  CheckIcon,
  FileTextIcon,
  GitBranchIcon,
  PlusIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react";
import { IconSidebarHiddenRightWide } from "central-icons";
import { useMemo, useState, type ComponentType } from "react";

import type { WorkbenchTab } from "~/lib/shell-panels-store";
import { cn } from "~/lib/utils";
import {
  workbenchMenuIconSlotClassName,
  workbenchMenuItemClassName,
  workbenchMenuMetaTextClassName,
  workbenchMenuPopupClassName,
  workbenchMenuPrimaryTextClassName,
} from "@multi/ui/menu";

const NEW_TAB_MENU_WIDTH =
  "w-[min(280px,var(--available-width))] min-w-[min(280px,var(--available-width))] max-w-[280px]";
const NEW_TAB_MENU_MAX_HEIGHT = "max-h-[min(720px,var(--available-height))]";

interface Tab {
  id: WorkbenchTab;
  label: string;
  menuLabel: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const tabs: Tab[] = [
  { id: "git", label: "Changes", menuLabel: "Changes", icon: GitBranchIcon },
  { id: "terminal", label: "Terminal", menuLabel: "Terminal", icon: TerminalIcon },
  { id: "files", label: "Files", menuLabel: "File", icon: FileTextIcon },
];

const openMenuItems: Array<
  | Tab
  | {
      id: "canvas";
      label: string;
      menuLabel: string;
      disabled: true;
      icon: ComponentType<{ className?: string }>;
    }
> = [
  ...tabs,
  { id: "canvas", label: "Canvas", menuLabel: "Canvas", icon: FileTextIcon, disabled: true },
];

function stopMenuSearchBubbling(event: React.KeyboardEvent) {
  event.stopPropagation();
}

export function WorkbenchTabBar(props: {
  active: WorkbenchTab;
  onTab: (tab: WorkbenchTab) => void;
  count: number;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const active = tabs.find((tab) => tab.id === props.active) ?? tabs[0]!;
  const filteredOpenItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return openMenuItems;
    return openMenuItems.filter((item) =>
      `${item.menuLabel} ${item.label}`.toLowerCase().includes(needle),
    );
  }, [query]);

  return (
    <div className="ui-tab-system editor-panel-tab-root editor-panel-tab-root--simple-tabs no-drag flex h-[35px] flex-none shrink-0 items-stretch bg-[var(--glass-editor-panel-tab-background,color-mix(in_srgb,var(--multi-bg-elevated)_88%,transparent))] px-1.5 backdrop-blur-xl [--tab-system-bar-background:transparent]">
      <div className="editor-panel-tab-bar-tab-cluster no-scrollbar flex min-w-0 flex-1 items-stretch overflow-hidden">
        {tabs.map((tab) => {
          const selected = tab.id === props.active;
          const Icon = tab.icon;
          const countText = tab.id === "git" && props.count > 0 ? `, ${props.count} changes` : "";
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => props.onTab(tab.id)}
              className={cn(
                "ui-tab-system-tab my-1.5 flex size-[22px] shrink-0 items-center justify-center rounded-[5px] text-multi-icon-secondary transition-colors hover:bg-multi-bg-quaternary hover:text-multi-icon-primary",
                selected && "bg-multi-bg-tertiary text-multi-icon-primary",
              )}
              aria-current={selected ? "page" : undefined}
              aria-label={`${tab.label}${countText}`}
              title={`${tab.label}${countText}`}
            >
              <Icon className="size-3.5" aria-hidden />
            </button>
          );
        })}
        <div className="editor-panel-tab-bar-spacer min-w-0 flex-1" />
        <div className="sr-only" aria-live="polite">
          {active.label}
        </div>
      </div>

      <Menu.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <Menu.Trigger
          className="glass-editor-panel-new-tab-menu-trigger ui-icon-button my-1.5 flex size-[22px] shrink-0 items-center justify-center rounded-[5px] text-multi-icon-secondary hover:bg-multi-bg-quaternary hover:text-multi-icon-primary data-[popup-open]:bg-multi-bg-tertiary data-[popup-open]:text-multi-icon-primary"
          aria-expanded={open}
          aria-label="Open new tab menu"
          title="Open new tab menu"
        >
          <PlusIcon className="size-3.5" aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            className="z-50 outline-none ring-0"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <Menu.Popup
              className={cn(
                workbenchMenuPopupClassName,
                "glass-editor-panel-new-tab-menu",
                NEW_TAB_MENU_WIDTH,
                NEW_TAB_MENU_MAX_HEIGHT,
              )}
            >
              <div className="ui-menu__search-row flex items-center gap-1 border-b border-multi-stroke-tertiary px-1.5 py-1.5">
                <SearchIcon className="size-3.5 shrink-0 text-multi-fg-tertiary" aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={stopMenuSearchBubbling}
                  placeholder="Open any file, URL, ..."
                  className="h-6 min-w-0 flex-1 bg-transparent text-[12px]/[16px] text-multi-fg-primary outline-none placeholder:text-multi-fg-quaternary"
                />
              </div>
              <div className="ui-menu__list flex flex-col gap-px p-1">
                {filteredOpenItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === props.active;
                  return (
                    <Menu.Item
                      key={item.id}
                      disabled={item.disabled}
                      onClick={() => {
                        if (item.disabled) return;
                        props.onTab(item.id as WorkbenchTab);
                        setOpen(false);
                      }}
                      className={cn(workbenchMenuItemClassName, "ui-menu__row gap-2")}
                    >
                      <span className={workbenchMenuIconSlotClassName}>
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <span className={cn(workbenchMenuPrimaryTextClassName, "flex-1")}>
                        {item.menuLabel}
                      </span>
                      {item.disabled ? (
                        <span className={workbenchMenuMetaTextClassName}>Soon</span>
                      ) : null}
                      {isActive ? (
                        <CheckIcon className="size-3.5 shrink-0 text-multi-fg-tertiary" />
                      ) : null}
                    </Menu.Item>
                  );
                })}
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <div className="editor-panel-overflow-action flex shrink-0 items-center py-1.5">
        <button
          type="button"
          onClick={props.onToggle}
          className="flex size-[22px] shrink-0 items-center justify-center rounded-[5px] text-multi-icon-secondary hover:bg-multi-bg-quaternary hover:text-multi-icon-primary"
          aria-label="Hide Panel"
          title="Hide Panel"
        >
          <IconSidebarHiddenRightWide className="size-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}
