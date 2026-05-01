import { memo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, type LucideIcon } from "lucide-react";
import { ThinkingStep, ThinkingStepDetails, type ThinkingStepStatus } from "./thinking-steps";

type ToolCallStatus = "loading" | "completed" | "error";

interface ToolCallCardProps {
  icon: LucideIcon;
  title: string;
  summary: string | null;
  detail: string | null;
  status: ToolCallStatus;
  isLast?: boolean;
}

export const ToolCallCard = memo(function ToolCallCard({
  icon,
  title,
  summary,
  detail,
  status,
  isLast = false,
}: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetail = detail !== null && detail.length > 0;

  return (
    <ThinkingStep
      icon={icon}
      title={title}
      summary={summary}
      status={toThinkingStepStatus(status)}
      isLast={isLast}
    >
      {hasDetail ? (
        <ThinkingStepDetails
          open={isExpanded}
          onOpenChange={setIsExpanded}
          triggerLabel={isExpanded ? "Hide" : "Show"}
          triggerIcon={
            isExpanded ? (
              <ChevronDownIcon className="size-3" />
            ) : (
              <ChevronRightIcon className="size-3" />
            )
          }
        >
          <pre className="mt-1.5 whitespace-pre-wrap break-words rounded-multi-control bg-multi-surface p-2 font-multi-mono text-detail text-foreground">
            {detail}
          </pre>
        </ThinkingStepDetails>
      ) : null}
    </ThinkingStep>
  );
});

function toThinkingStepStatus(status: ToolCallStatus): ThinkingStepStatus {
  switch (status) {
    case "loading":
      return "active";
    case "completed":
      return "complete";
    case "error":
      return "error";
  }
}
