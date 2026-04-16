import { IconCollaborationPointerRight, IconSidebarHiddenLeftWide } from "central-icons";

import { RowButton } from "~/components/shell/shared/row-button";

export function ShellSidebarHeader(props: { onNewChat: () => void; onCollapse?: () => void }) {
  return (
    <div className="relative z-30 flex shrink-0 items-center gap-1 px-2 pb-2 pt-1.5">
      <RowButton variant="chrome" onClick={props.onNewChat} className="flex-1">
        <IconCollaborationPointerRight className="size-4 shrink-0 opacity-60" />
        <span>New Agent</span>
      </RowButton>
      {props.onCollapse ? (
        <button
          type="button"
          onClick={props.onCollapse}
          className="flex size-7 shrink-0 items-center justify-center rounded-chrome-control text-muted-foreground/60 transition-colors [&_svg]:block hover:bg-chrome-hover hover:text-foreground"
          aria-label="Collapse sidebar"
        >
          <IconSidebarHiddenLeftWide className="size-4 shrink-0" />
        </button>
      ) : null}
    </div>
  );
}
