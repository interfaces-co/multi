import {
  IconCollaborationPointerRight,
  IconPlusLarge,
  IconSidebarHiddenLeftWide,
} from "central-icons";

import { RowButton } from "~/components/shell/shared/row-button";

export function ShellSidebarHeader(props: {
  onNewChat: () => void;
  onAddProject?: () => void;
  onCollapse?: () => void;
}) {
  return (
    <div className="agent-window-sidebar-header relative z-30 flex shrink-0 flex-col gap-1 px-2 pb-1.5 pt-2">
      <div className="agent-window-sidebar-header-top flex min-w-0 items-center gap-1">
        <RowButton
          variant="chrome"
          onClick={props.onNewChat}
          className="agent-window-new-agent flex-1 pl-2 pr-1.5"
        >
          <IconCollaborationPointerRight className="size-3.5 shrink-0 opacity-65" />
          <span className="min-w-0 flex-1 truncate">New Agent</span>
          <span className="agent-window-shortcut shrink-0">⌘N</span>
        </RowButton>
        {props.onCollapse ? (
          <button
            type="button"
            onClick={props.onCollapse}
            className="agent-window-icon-button flex size-7 shrink-0 items-center justify-center rounded-multi-control text-muted-foreground/60 transition-colors [&_svg]:block hover:bg-multi-hover hover:text-foreground"
            aria-label="Collapse sidebar"
          >
            <IconSidebarHiddenLeftWide className="size-4 shrink-0" />
          </button>
        ) : null}
      </div>
      {props.onAddProject ? (
        <button
          type="button"
          onClick={props.onAddProject}
          className="agent-window-open-workspace flex min-h-6 w-full min-w-0 items-center gap-1.5 rounded-multi-control px-2 py-1 text-left font-multi text-[11px]/[14px] text-muted-foreground/72 transition-colors hover:bg-multi-hover hover:text-foreground"
          aria-label="Open workspace"
          data-testid="sidebar-add-project-trigger"
        >
          <IconPlusLarge className="size-3 shrink-0 opacity-65" />
          <span className="min-w-0 flex-1 truncate">Open Workspace</span>
        </button>
      ) : null}
    </div>
  );
}
