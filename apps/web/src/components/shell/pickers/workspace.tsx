import { IconChevronDownSmall, IconFolder1 } from "central-icons";
import { useShellState } from "~/hooks/use-shell-cwd";
import { shortWorkspacePathLabel } from "~/lib/path-label";
import { pickWorkspace } from "~/lib/workspace-routing";
import { cn } from "~/lib/utils";

export function WorkspacePicker(props: { className?: string; variant?: "rail" | "composer" }) {
  const shell = useShellState();
  const rail = props.variant !== "composer";

  return (
    <button
      type="button"
      onClick={() => void pickWorkspace()}
      className={cn(
        "font-chrome flex min-w-0 items-center gap-1.5 text-left transition-colors",
        rail
          ? "sidebar-label-track justify-start gap-2 rounded-chrome-control px-2 py-1 text-muted-foreground/65 hover:bg-chrome-hover hover:text-foreground"
          : "sidebar-label-track max-w-[min(100%,14rem)] justify-start rounded-chrome-control px-1.5 py-0.5 text-muted-foreground/80 hover:bg-chrome-hover/80 hover:text-foreground",
        props.className,
      )}
      title={shell.cwd ?? "Choose workspace"}
    >
      <IconFolder1 className="size-4 shrink-0 opacity-60" />
      <span className="min-w-0 truncate">
        {shell.cwd ? shortWorkspacePathLabel(shell.cwd, shell.home) : "Workspace"}
      </span>
      {rail ? null : <IconChevronDownSmall className="size-3.5 shrink-0 opacity-55" aria-hidden />}
    </button>
  );
}
