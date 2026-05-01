"use client";

import { List } from "lucide-react";

import { cn } from "~/lib/utils";

/**
 * Full-width row under the workbench tab strip (Cursor / VS Code panel title alignment).
 */
export function TerminalWorkbenchSubChrome(props: {
  railOpen: boolean;
  onToggleRail: () => void;
  shellCaption: string;
}) {
  return (
    <div className="no-drag multi-workbench-panel-title-row flex w-full shrink-0 flex-row flex-nowrap items-center gap-1.5">
      <button
        type="button"
        className={cn(
          "no-drag flex shrink-0 items-center justify-center rounded-[5px] px-(--multi-workbench-chrome-icon-padding-x) outline-none transition-colors",
          // Match tool-island density inside the subtler panel title band
          "min-h-[calc(var(--multi-workbench-panel-title-row-height,29px)-4px)]",
          props.railOpen
            ? "bg-multi-bg-tertiary text-multi-icon-primary"
            : "bg-transparent text-multi-icon-secondary hover:bg-multi-bg-quaternary hover:text-multi-icon-primary",
        )}
        aria-label={props.railOpen ? "Hide terminal sessions" : "Show terminal sessions"}
        aria-pressed={props.railOpen}
        title={props.railOpen ? "Hide sessions list" : "Show sessions list"}
        onClick={props.onToggleRail}
      >
        <List className="size-[15px]" aria-hidden />
      </button>
      <span className="min-w-0 truncate text-[13px]/[17px] font-medium tracking-[-0.01em] text-foreground/88">
        {props.shellCaption}
      </span>
    </div>
  );
}
