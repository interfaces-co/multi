"use client";

import { type ReactNode, useRef } from "react";

import {
  type WorkbenchTab,
  SECONDARY_RAIL_LIMITS,
  shellPanelsActions,
  useSecondaryRail,
} from "~/lib/shell-panels-store";
import { cn } from "~/lib/utils";

import { useColumnResize } from "./use-column-resize";

export function RightWorkbenchLayout(props: {
  cwd: string | null;
  tab: WorkbenchTab;
  rail?: ReactNode;
  railOpen?: boolean;
  railHostClassName?: string;
  children: ReactNode;
}) {
  const { open: persistedRailOpen, width: railWidth } = useSecondaryRail(props.cwd, props.tab);
  const railOpen = props.railOpen ?? persistedRailOpen;
  const showRail = props.rail != null && railOpen;

  const railRef = useRef<HTMLDivElement | null>(null);
  const resize = useColumnResize({
    width: railWidth,
    limits: SECONDARY_RAIL_LIMITS,
    elementRef: railRef,
    direction: "right",
    onCommit: (nextWidth) =>
      shellPanelsActions.setSecondaryRailWidth(props.cwd, props.tab, nextWidth),
  });

  return (
    <div className="multi-shell-workbench-columns flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
      {showRail ? (
        <div
          className={cn(
            "multi-shell-secondary-rail relative flex min-h-0 shrink-0",
            props.railHostClassName,
          )}
          ref={railRef}
          style={{ width: railWidth }}
        >
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              resize.dragging
                ? "transition-none"
                : "transition-[width] duration-100 ease-out motion-reduce:transition-none",
            )}
          >
            {props.rail}
          </div>
          <div
            aria-label="Resize secondary pane width"
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
        </div>
      ) : null}
      <div className="multi-shell-workbench-preview flex min-h-0 min-w-0 flex-1 flex-col">
        {props.children}
      </div>
    </div>
  );
}
