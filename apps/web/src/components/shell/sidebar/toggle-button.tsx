import { IconSidebar, IconSidebarHiddenLeftWide } from "central-icons";

import { shellPanelsActions, useLeftOpen } from "~/lib/shell-panels-store";

export function ShellSidebarToggleButton(props: { shellCwd: string | null; className?: string }) {
  const leftOpen = useLeftOpen(props.shellCwd);

  return (
    <button
      type="button"
      onClick={() => shellPanelsActions.toggleLeft(props.shellCwd)}
      className={props.className}
      aria-label={leftOpen ? "Collapse chats" : "Expand chats"}
      title={leftOpen ? "Collapse chats" : "Expand chats"}
    >
      {leftOpen ? (
        <IconSidebarHiddenLeftWide className="size-4 shrink-0" />
      ) : (
        <IconSidebar className="size-4 shrink-0" />
      )}
    </button>
  );
}
