import type { ReactNode } from "react";

import { isElectron } from "~/env";
import { cn } from "~/lib/utils";

export type DiffPanelMode = "inline" | "sheet" | "sidebar";

function getDiffPanelHeaderRowClassName(mode: DiffPanelMode) {
  const shouldUseDragRegion = isElectron && mode !== "sheet";
  return cn(
    "flex items-center justify-between gap-2 px-4 wco:pr-[calc(100vw-env(titlebar-area-width)-env(titlebar-area-x)+1em)]",
    shouldUseDragRegion
      ? "drag-region h-[52px] border-b border-border wco:h-[env(titlebar-area-height)]"
      : "h-12 wco:max-h-[env(titlebar-area-height)]",
  );
}

export function DiffPanelShell(props: {
  mode: DiffPanelMode;
  header: ReactNode;
  children: ReactNode;
}) {
  const shouldUseDragRegion = isElectron && props.mode !== "sheet";

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col bg-background",
        props.mode === "inline"
          ? "w-[42vw] min-w-[360px] max-w-[560px] shrink-0 border-l border-border"
          : "w-full",
      )}
    >
      {shouldUseDragRegion ? (
        <div className={getDiffPanelHeaderRowClassName(props.mode)}>{props.header}</div>
      ) : (
        <div className="border-b border-border">
          <div className={getDiffPanelHeaderRowClassName(props.mode)}>{props.header}</div>
        </div>
      )}
      {props.children}
    </div>
  );
}

export function DiffPanelMessageState(props: { label: string }) {
  return (
    <div
      className="flex min-h-0 flex-1 items-center justify-center px-5 text-center text-xs text-muted-foreground/70"
      role="status"
      aria-live="polite"
      aria-label={props.label}
    >
      <p>{props.label}</p>
    </div>
  );
}
