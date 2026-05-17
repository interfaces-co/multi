import type { ProviderInteractionMode, RuntimeMode } from "@multi/contracts";
import { Button } from "@multi/ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@multi/ui/select";
import { Separator } from "@multi/ui/separator";
import {
  IconLock,
  IconPencilLine,
  IconRobot,
  IconSquareChecklist,
  IconUnlocked,
  type CentralIconBaseProps,
} from "central-icons";
import { memo, type ComponentType } from "react";

import { cn } from "~/lib/utils";

type CentralIconComponent = ComponentType<CentralIconBaseProps>;

const runtimeModeConfig: Record<
  RuntimeMode,
  { label: string; description: string; icon: CentralIconComponent }
> = {
  "approval-required": {
    label: "Supervised",
    description: "Ask before commands and file changes.",
    icon: IconLock,
  },
  "auto-accept-edits": {
    label: "Auto-accept edits",
    description: "Auto-approve edits, ask before other actions.",
    icon: IconPencilLine,
  },
  "full-access": {
    label: "Full access",
    description: "Allow commands and edits without prompts.",
    icon: IconUnlocked,
  },
};

const runtimeModeOptions = Object.keys(runtimeModeConfig) as RuntimeMode[];

export const ComposerFooterModeControls = memo(function ComposerFooterModeControls(props: {
  showInteractionModeToggle: boolean;
  interactionMode: ProviderInteractionMode;
  runtimeMode: RuntimeMode;
  showPlanToggle: boolean;
  planLabel: string;
  planTabActive: boolean;
  onToggleInteractionMode: () => void;
  onRuntimeModeChange: (mode: RuntimeMode) => void;
  openPlanTab: () => void;
}) {
  const runtimeModeOption = runtimeModeConfig[props.runtimeMode];
  const RuntimeModeIcon = runtimeModeOption.icon;

  return (
    <>
      <Separator orientation="vertical" className="mx-0.5 hidden h-4 sm:block" />

      {props.showInteractionModeToggle ? (
        <>
          <Button
            variant="ghost"
            className="composer-unified-dropdown shrink-0 select-none whitespace-nowrap px-2.5 text-muted-foreground/70 hover:text-foreground/80 sm:px-3"
            data-mode={props.interactionMode === "plan" ? "plan" : "chat"}
            size="sm"
            type="button"
            onClick={props.onToggleInteractionMode}
            title={
              props.interactionMode === "plan"
                ? "Plan mode — click to return to normal build mode"
                : "Default mode — click to enter plan mode"
            }
          >
            <IconRobot />
            <span className="sr-only sm:not-sr-only">
              {props.interactionMode === "plan" ? "Plan" : "Build"}
            </span>
          </Button>

          <Separator orientation="vertical" className="mx-0.5 hidden h-4 sm:block" />
        </>
      ) : null}

      <Select
        value={props.runtimeMode}
        onValueChange={(value) => props.onRuntimeModeChange(value!)}
      >
        <SelectTrigger
          variant="ghost"
          size="sm"
          className="select-none font-medium"
          aria-label="Runtime mode"
          title={runtimeModeOption.description}
        >
          <RuntimeModeIcon className="size-4" />
          <SelectValue>{runtimeModeOption.label}</SelectValue>
        </SelectTrigger>
        <SelectPopup alignItemWithTrigger={false}>
          {runtimeModeOptions.map((mode) => {
            const option = runtimeModeConfig[mode];
            const OptionIcon = option.icon;
            return (
              <SelectItem key={mode} value={mode} className="min-w-64 py-2">
                <div className="grid min-w-0 gap-0.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <OptionIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    {option.label}
                  </span>
                  <span className="text-muted-foreground text-xs leading-4">
                    {option.description}
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectPopup>
      </Select>

      {props.showPlanToggle ? (
        <>
          <Separator orientation="vertical" className="mx-0.5 hidden h-4 sm:block" />
          <Button
            variant="ghost"
            className={cn(
              "shrink-0 select-none whitespace-nowrap px-2.5 sm:px-3",
              props.planTabActive
                ? "text-blue-400 hover:text-blue-300"
                : "text-muted-foreground/70 hover:text-foreground/80",
            )}
            size="sm"
            type="button"
            onClick={props.openPlanTab}
            title={`Open ${props.planLabel}`}
          >
            <IconSquareChecklist />
            <span className="sr-only sm:not-sr-only">{`Open ${props.planLabel}`}</span>
          </Button>
        </>
      ) : null}
    </>
  );
});
