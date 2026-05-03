"use client";

import { usePretextOneLine } from "~/hooks/use-composer-pretext-one-line";
import { cn } from "~/lib/utils";

export function PretextOneLine(props: {
  text: string;
  className?: string;
  title?: string;
  fontPx?: number;
  lineHeightPx?: number;
  truncate?: "end" | "middle";
}) {
  const { ref, shown, fallback } = usePretextOneLine({
    text: props.text,
    ...(props.fontPx !== undefined ? { fontPx: props.fontPx } : {}),
    ...(props.lineHeightPx !== undefined ? { lineHeightPx: props.lineHeightPx } : {}),
    ...(props.truncate !== undefined ? { truncate: props.truncate } : {}),
  });

  return (
    <span
      ref={ref}
      title={props.title ?? props.text}
      className={cn(
        "block min-w-0 overflow-hidden whitespace-nowrap",
        props.className,
        fallback && "truncate",
      )}
    >
      {shown}
    </span>
  );
}
