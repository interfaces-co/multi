"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const pillVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full font-medium outline-none transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    defaultVariants: {
      size: "sm",
      tone: "subtle",
    },
    variants: {
      size: {
        sm: "h-5 min-w-5 px-2 text-multi-xs",
        md: "h-6 min-w-6 px-2.5 text-multi-sm",
      },
      tone: {
        subtle: "bg-multi-bg-quaternary text-multi-fg-tertiary hover:text-multi-fg-secondary",
        accent: "bg-primary/16 text-primary",
        success: "bg-success/16 text-success-foreground",
        warning: "bg-warning/16 text-warning-foreground",
        danger: "bg-destructive/16 text-destructive-foreground",
      },
      interactive: {
        true: "cursor-pointer focus-visible:ring-1 focus-visible:ring-multi-stroke-focused focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      },
    },
  },
);

interface PillProps extends useRender.ComponentProps<"span"> {
  size?: VariantProps<typeof pillVariants>["size"];
  tone?: VariantProps<typeof pillVariants>["tone"];
  interactive?: VariantProps<typeof pillVariants>["interactive"];
}

function Pill({ className, size, tone, interactive, render, ...props }: PillProps) {
  const defaultProps = {
    className: cn(pillVariants({ className, interactive, size, tone })),
    "data-slot": "pill",
  };

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(defaultProps, props),
    render,
  });
}

export { Pill, pillVariants };
