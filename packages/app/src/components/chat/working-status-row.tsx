import { memo, useEffect, useState } from "react";

interface WorkingStatusRowProps {
  createdAt: string | null;
}

export const WorkingStatusRow = memo(function WorkingStatusRow({
  createdAt,
}: WorkingStatusRowProps) {
  return (
    <div className="multi-working-row py-0.5">
      <div className="flex items-center gap-1 text-body text-muted-foreground/70">
        <span className="inline-flex items-center gap-[3px]">
          <span className="size-1 rounded-full bg-muted-foreground/40 animate-pulse" />
          <span className="size-1 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:200ms]" />
          <span className="size-1 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:400ms]" />
        </span>
        <span>
          {createdAt ? (
            <>
              Working for <WorkingTimer createdAt={createdAt} />
            </>
          ) : (
            "Working..."
          )}
        </span>
      </div>
    </div>
  );
});

function WorkingTimer({ createdAt }: { createdAt: string }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  return <>{formatWorkingTimer(createdAt, new Date(nowMs).toISOString()) ?? "0s"}</>;
}

function formatWorkingTimer(startIso: string, endIso: string): string | null {
  const startedAtMs = Date.parse(startIso);
  const endedAtMs = Date.parse(endIso);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) {
    return null;
  }

  const elapsedSeconds = Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000));
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s`;
  }

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}
