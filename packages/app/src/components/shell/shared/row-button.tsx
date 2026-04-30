import type { ComponentProps } from "react";

import { Button } from "@multi/ui/button";
import { cn } from "~/lib/utils";

type RowProps = Omit<ComponentProps<typeof Button>, "type" | "variant">;

/** Sidebar rows: `chrome` matches the New Chat label style; `agent` uses the list type scale. */
export function RowButton(
  props: RowProps & {
    variant: "chrome" | "agent";
  },
) {
  const { variant, className, ...rest } = props;
  return (
    <Button
      type="button"
      variant="cursor-ghost"
      className={cn(
        variant === "chrome"
          ? "font-multi flex min-h-6.5 w-full items-center justify-start gap-1.5 rounded-multi-control border border-transparent px-2 py-1 text-left text-[12px]/[16px] text-muted-foreground transition-colors"
          : "agent-sidebar-cell font-multi flex min-h-6 w-full items-center justify-start gap-2 rounded-multi-control border border-transparent px-1.5 py-1 text-left text-[12px]/[16px] text-muted-foreground transition-colors",
        "hover:bg-multi-hover hover:text-foreground data-[selected=true]:border-multi-border/90 data-[selected=true]:bg-multi-active data-[selected=true]:text-foreground",
        className,
      )}
      {...rest}
    />
  );
}
