import { memo, type HTMLAttributes, type ReactNode } from "react";
import { CheckIcon, CircleAlertIcon, LoaderIcon, type LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

export type ThinkingStepStatus = "active" | "complete" | "error";

interface ThinkingStepsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const ThinkingSteps = memo(function ThinkingSteps({
  children,
  className,
  ...props
}: ThinkingStepsProps) {
  return (
    <div
      className={cn("flex w-fit max-w-[min(100%,var(--composer-max-width))] flex-col", className)}
      {...props}
    >
      {children}
    </div>
  );
});

interface ThinkingStepProps extends HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  summary?: string | null;
  status: ThinkingStepStatus;
  isLast?: boolean;
  children?: ReactNode;
}

export const ThinkingStep = memo(function ThinkingStep({
  icon: Icon,
  title,
  summary,
  status,
  isLast = false,
  children,
  className,
  ...props
}: ThinkingStepProps) {
  const isActive = status === "active";

  return (
    <div
      className={cn("flex max-w-full min-w-0 gap-2.5", className)}
      data-status={status}
      data-last={isLast ? "true" : undefined}
      {...props}
    >
      <div className="flex shrink-0 basis-4 flex-col items-center pt-2.5" aria-hidden="true">
        <span
          className={cn(
            "flex size-[18px] items-center justify-center rounded-multi-pill border border-multi-stroke-tertiary bg-multi-editor text-muted-foreground",
            status === "active" && "border-multi-stroke-strong text-foreground",
            status === "error" && "border-red-500 text-destructive-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </span>
        {!isLast ? <span className="mt-1 min-h-2.5 w-px flex-1 bg-multi-stroke-tertiary" /> : null}
      </div>
      <div
        className={cn(
          "mb-1.5 min-w-0 rounded-multi-card border border-multi-stroke-tertiary bg-multi-editor px-3 py-2.5 text-foreground transition-[border-color,background-color] duration-150 ease-out",
          "w-[min(100%,560px)]",
          status === "active" && "border-multi-stroke-strong",
          status === "error" && "border-red-500",
          isLast && "mb-0",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span className={cn("min-w-0 text-body font-medium", isActive && "thinking-shimmer")}>
            {title}
            {isActive ? "..." : null}
          </span>
          <span
            className="shrink-0 pt-px text-caption text-muted-foreground"
            aria-label={statusLabel(status)}
          >
            <StepStatusIcon status={status} />
          </span>
        </div>
        {summary ? (
          <span className="mt-0.5 block text-body text-muted-foreground break-words">
            {summary}
          </span>
        ) : null}
        {children ? <div className="mt-1.5">{children}</div> : null}
      </div>
    </div>
  );
});

interface ThinkingStepDetailsProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  triggerIcon: ReactNode;
  children: ReactNode;
}

export const ThinkingStepDetails = memo(function ThinkingStepDetails({
  open,
  onOpenChange,
  triggerLabel,
  triggerIcon,
  children,
  className,
  ...props
}: ThinkingStepDetailsProps) {
  return (
    <div className={cn(className)} {...props}>
      <button
        type="button"
        className="inline-flex cursor-pointer items-center gap-0.5 text-caption text-muted-foreground transition-colors duration-100 hover:text-foreground"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        {triggerIcon}
        <span>{triggerLabel}</span>
      </button>
      {open ? (
        <div className="animate-thinking-details-in origin-top-left will-change-[transform,opacity] motion-reduce:animate-none">
          {children}
        </div>
      ) : null}
    </div>
  );
});

function StepStatusIcon({ status }: { status: ThinkingStepStatus }) {
  switch (status) {
    case "active":
      return <LoaderIcon className="size-3 animate-spin" />;
    case "complete":
      return <CheckIcon className="size-3" />;
    case "error":
      return <CircleAlertIcon className="size-3" />;
  }
}

function statusLabel(status: ThinkingStepStatus) {
  switch (status) {
    case "active":
      return "In progress";
    case "complete":
      return "Completed";
    case "error":
      return "Error";
  }
}
