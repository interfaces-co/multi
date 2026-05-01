import { memo, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  type LucideIcon,
  LoaderIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";

type ToolCallStatus = "loading" | "completed" | "error";

interface ToolCallCardProps {
  icon: LucideIcon;
  title: string;
  summary: string | null;
  detail: string | null;
  status: ToolCallStatus;
}

export const ToolCallCard = memo(function ToolCallCard({
  icon: Icon,
  title,
  summary,
  detail,
  status,
}: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetail = detail !== null && detail.length > 0;

  return (
    <div className="multi-tool-call-card" data-status={status}>
      <div className="multi-tool-call-card__header">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span className="multi-tool-call-card__icon flex size-4 shrink-0 items-center justify-center">
            <Icon className="size-3" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="multi-tool-call-card__title">{title}</span>
            {summary && <span className="multi-tool-call-card__summary">{summary}</span>}
          </div>
        </div>
        <span className="multi-tool-call-card__status">
          <StatusIndicator status={status} />
        </span>
      </div>
      {hasDetail && (
        <button
          type="button"
          className="multi-tool-call-card__toggle"
          onClick={() => setIsExpanded((v) => !v)}
        >
          {isExpanded ? (
            <ChevronDownIcon className="size-3" />
          ) : (
            <ChevronRightIcon className="size-3" />
          )}
          <span>{isExpanded ? "Hide" : "Show"}</span>
        </button>
      )}
      {isExpanded && hasDetail && <pre className="multi-tool-call-card__args">{detail}</pre>}
    </div>
  );
});

function StatusIndicator({ status }: { status: ToolCallStatus }) {
  switch (status) {
    case "loading":
      return <LoaderIcon className={cn("size-3 animate-spin")} />;
    case "completed":
      return <CheckIcon className="size-3" />;
    case "error":
      return <CircleAlertIcon className="size-3" />;
  }
}
