"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  type WorkbenchTab,
  SECONDARY_RAIL_LIMITS,
  shellPanelsActions,
  useSecondaryRail,
} from "~/lib/shell-panels-store";
import { cn } from "~/lib/utils";

interface ResizeState {
  base: number;
  pointerId: number;
  raf: number | null;
  rail: HTMLDivElement;
  startX: number;
  width: number;
}

function clampRailWidth(width: number): number {
  return Math.min(
    SECONDARY_RAIL_LIMITS.max,
    Math.max(SECONDARY_RAIL_LIMITS.min, Number.isFinite(width) ? width : SECONDARY_RAIL_LIMITS.min),
  );
}

export function RightWorkbenchLayout(props: {
  cwd: string | null;
  tab: WorkbenchTab;
  rail?: ReactNode;
  railHostClassName?: string;
  children: ReactNode;
}) {
  const { open: railOpen, width: railWidth } = useSecondaryRail(props.cwd, props.tab);
  const showRail = props.rail != null && railOpen;

  const [dragging, setDragging] = useState(false);
  const railStateRef = useRef<ResizeState | null>(null);
  const liveWidthRef = useRef(railWidth);
  const railRef = useRef<HTMLDivElement | null>(null);

  if (!dragging) {
    liveWidthRef.current = railWidth;
  }

  useEffect(() => {
    return () => {
      const drag = railStateRef.current;
      if (drag?.raf !== null && drag?.raf !== undefined) {
        window.cancelAnimationFrame(drag.raf);
      }
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
  }, []);

  const stopResize = (pointerId: number) => {
    const drag = railStateRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    if (drag.raf !== null) window.cancelAnimationFrame(drag.raf);
    const nextWidth = drag.width;
    if (drag.rail.hasPointerCapture(pointerId)) {
      drag.rail.releasePointerCapture(pointerId);
    }
    railStateRef.current = null;
    setDragging(false);
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    shellPanelsActions.setSecondaryRailWidth(props.cwd, props.tab, nextWidth);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const node = railRef.current;
    if (!node) return;
    const width = liveWidthRef.current;
    node.style.width = `${width}px`;
    railStateRef.current = {
      base: width,
      pointerId: event.pointerId,
      raf: null,
      rail: event.currentTarget,
      startX: event.clientX,
      width,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.preventDefault();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = railStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = event.clientX - drag.startX;
    const nextWidth = clampRailWidth(drag.base + delta);
    drag.width = nextWidth;
    liveWidthRef.current = nextWidth;
    if (drag.raf !== null) {
      event.preventDefault();
      return;
    }
    drag.raf = window.requestAnimationFrame(() => {
      const activeDrag = railStateRef.current;
      if (!activeDrag) return;
      activeDrag.raf = null;
      if (railRef.current) railRef.current.style.width = `${activeDrag.width}px`;
    });
    event.preventDefault();
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    stopResize(event.pointerId);
    event.preventDefault();
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-row">
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
              dragging
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
              dragging ? "multi-shell-sash-hit-area--active" : null,
            )}
            onPointerCancel={handlePointerUp}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            role="separator"
          >
            <div aria-hidden className="multi-shell-sash-hit-feedback" />
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{props.children}</div>
    </div>
  );
}
