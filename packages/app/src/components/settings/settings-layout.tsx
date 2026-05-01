import { Undo2Icon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { cn } from "../../lib/utils";
import { Button } from "@multi/ui/button";
import { Text } from "@multi/ui/text";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@multi/ui/tooltip";

/** Re-render every `intervalMs`; return a stable timestamp snapshot for render-time relative labels. */
export function useRelativeTimeTick(intervalMs = 1_000) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return nowMs;
}

export function SettingsSection({
  title,
  icon,
  headerAction,
  children,
}: {
  title: string;
  icon?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex min-h-5 items-center justify-between px-1.5">
        <Text
          render={<h2 />}
          className="flex items-center gap-1.5"
          size="xs"
          tone="tertiary"
          weight="medium"
        >
          {icon}
          {title}
        </Text>
        {headerAction}
      </div>
      <div className="relative overflow-hidden rounded-lg bg-multi-bg-quinary text-card-foreground">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  title,
  description,
  status,
  resetAction,
  control,
  children,
}: {
  title: ReactNode;
  description: string;
  status?: ReactNode;
  resetAction?: ReactNode;
  control?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-t border-[var(--multi-stroke-quaternary)] px-2.5 first:border-t-0 sm:px-3",
        children ? "pt-3 pb-0" : "py-2.5",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-h-4 items-center gap-1.5">
            <Text render={<h3 />} size="sm" tone="primary" weight="medium">
              {title}
            </Text>
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
              {resetAction}
            </span>
          </div>
          <Text render={<p />} size="xs" tone="tertiary" className="block">
            {description}
          </Text>
          {status ? (
            <Text render={<div />} size="xs" tone="tertiary" className="block pt-1">
              {status}
            </Text>
          ) : null}
        </div>
        {control ? (
          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:justify-end">
            {control}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function SettingResetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Reset ${label} to default`}
            className="size-5 rounded-sm p-0 text-multi-fg-tertiary hover:text-multi-fg-primary"
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
          >
            <Undo2Icon className="size-3" />
          </Button>
        }
      />
      <TooltipPopup side="top">Reset to default</TooltipPopup>
    </Tooltip>
  );
}

export function SettingsPageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-12 sm:px-8 sm:py-17">
      <div className="mx-auto flex w-full max-w-[550px] flex-col gap-5">{children}</div>
    </div>
  );
}
