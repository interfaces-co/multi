import { memo } from "react";
import { ThinkingIndicator } from "./thinking-indicator";

interface WorkingStatusRowProps {
  createdAt: string | null;
}

export const WorkingStatusRow = memo(function WorkingStatusRow({
  createdAt,
}: WorkingStatusRowProps) {
  return (
    <div className="multi-working-row py-0.5">
      <ThinkingIndicator createdAt={createdAt} />
    </div>
  );
});
