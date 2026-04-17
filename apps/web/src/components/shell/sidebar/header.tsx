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
    <div className="relative z-30 flex shrink-0 items-center gap-1 px-2 pb-2 pt-1.5">
      <RowButton variant="chrome" onClick={props.onNewChat} className="flex-1">
        <IconCollaborationPointerRight className="size-4 shrink-0 opacity-60" />
        <span>New Agent</span>
      </RowButton>
      {props.onAddProject ? (
        <button
          type="button"
          onClick={props.onAddProject}
          className="flex size-7 shrink-0 items-center justify-center rounded-multi-control text-muted-foreground/60 transition-colors [&_svg]:block hover:bg-multi-hover hover:text-foreground"
          aria-label="Add project"
          data-testid="sidebar-add-project-trigger"
          title="Add project"
        >
          <IconPlusLarge className="size-4 shrink-0" />
        </button>
      ) : null}
      {props.onCollapse ? (
        <button
          type="button"
          onClick={props.onCollapse}
          className="flex size-7 shrink-0 items-center justify-center rounded-multi-control text-muted-foreground/60 transition-colors [&_svg]:block hover:bg-multi-hover hover:text-foreground"
          aria-label="Collapse sidebar"
        >
          <IconSidebarHiddenLeftWide className="size-4 shrink-0" />
        </button>
      ) : null}
    </div>
  );
}
