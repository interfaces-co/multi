"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "./utils";

const listVariants = cva("flex min-w-0 flex-col", {
  defaultVariants: {
    gap: "tight",
  },
  variants: {
    gap: {
      none: "gap-0",
      tight: "gap-px",
      sm: "gap-1",
      md: "gap-1.5",
    },
  },
});

interface ListProps extends useRender.ComponentProps<"ul"> {
  gap?: VariantProps<typeof listVariants>["gap"];
}

function List({ className, gap, render, ...props }: ListProps) {
  const defaultProps = {
    className: cn(listVariants({ className, gap })),
    "data-slot": "list",
  };

  return useRender({
    defaultTagName: "ul",
    props: mergeProps<"ul">(defaultProps, props),
    render,
  });
}

const listItemVariants = cva(
  "relative flex min-w-0 cursor-pointer select-none items-center gap-2 rounded-md px-1.5 py-[5px] text-multi-base text-multi-fg-secondary transition-colors hover:bg-multi-bg-quaternary hover:text-multi-fg-primary data-[selected=true]:bg-multi-bg-tertiary data-[selected=true]:text-multi-fg-primary focus-visible:outline-1 focus-visible:outline-multi-stroke-focused focus-visible:outline-offset-[-1px]",
  {
    defaultVariants: {
      density: "default",
    },
    variants: {
      density: {
        compact: "min-h-5 py-1",
        default: "min-h-6",
        comfortable: "min-h-7",
      },
      align: {
        center: "items-center",
        start: "items-start",
      },
    },
  },
);

interface ListItemProps extends useRender.ComponentProps<"li"> {
  density?: VariantProps<typeof listItemVariants>["density"];
  align?: VariantProps<typeof listItemVariants>["align"];
  selected?: boolean;
}

function ListItem({ className, density, align, selected, render, ...props }: ListItemProps) {
  const defaultProps = {
    className: cn(listItemVariants({ align, className, density })),
    "data-slot": "list-item",
    "data-selected": selected ? "true" : undefined,
  };

  return useRender({
    defaultTagName: "li",
    props: mergeProps<"li">(defaultProps, props),
    render,
  });
}

function ListItemLeading({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden", className)}
      data-slot="list-item-leading"
      {...props}
    />
  );
}

function ListItemContent({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden pl-0.5",
        "[mask-image:linear-gradient(90deg,#000_calc(100%-16px),transparent)] [-webkit-mask-image:linear-gradient(90deg,#000_calc(100%-16px),transparent)]",
        className,
      )}
      data-slot="list-item-content"
      {...props}
    />
  );
}

function ListItemTitle({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-multi-base text-multi-fg-secondary",
        "data-[selected=true]_&:text-multi-fg-primary",
        className,
      )}
      data-slot="list-item-title"
      {...props}
    />
  );
}

function ListItemSubtitle({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-multi-sm text-multi-fg-tertiary",
        className,
      )}
      data-slot="list-item-subtitle"
      {...props}
    />
  );
}

function ListItemTrailing({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("flex shrink-0 items-center gap-1", className)}
      data-slot="list-item-trailing"
      {...props}
    />
  );
}

export {
  List,
  ListItem,
  ListItemContent,
  ListItemLeading,
  ListItemSubtitle,
  ListItemTitle,
  ListItemTrailing,
  listItemVariants,
  listVariants,
};
