import { IconCollaborationPointerRight, IconSidebarHiddenLeftWide } from "central-icons";

import { GlassRowButton } from "~/components/glass/shared/row-button";

export function GlassSidebarHeader(props: {
  onNewChat: () => void;
  onCollapse?: () => void;
}) {
  return (
    <div className="relative z-30 flex shrink-0 items-center gap-1 px-2 pb-2 pt-1.5">
      <GlassRowButton variant="chrome" onClick={props.onNewChat} className="flex-1">
        <IconCollaborationPointerRight className="size-4 shrink-0 opacity-60" />
        <span>New Agent</span>
      </GlassRowButton>
      {props.onCollapse ? (
        <button
          type="button"
          onClick={props.onCollapse}
          className="flex size-7 shrink-0 items-center justify-center rounded-glass-control text-muted-foreground/60 transition-colors [&_svg]:block hover:bg-glass-hover hover:text-foreground"
          aria-label="Collapse sidebar"
        >
          <IconSidebarHiddenLeftWide className="size-4 shrink-0" />
        </button>
      ) : null}
    </div>
  );
}
