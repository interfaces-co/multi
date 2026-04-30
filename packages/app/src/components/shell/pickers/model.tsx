import type { HarnessModelRef, ThinkingLevel } from "~/lib/ui-session-types";
import { Menu } from "@base-ui/react/menu";
import { LockIcon } from "lucide-react";
import {
  cursorMenuIconSlotClassName,
  cursorMenuItemClassName,
  cursorMenuMetaTextClassName,
  cursorMenuPrimaryTextClassName,
  cursorMenuSeparatorClassName,
} from "@multi/ui/menu";
import { IconBrain, IconCheckmark1Small, IconChevronRight } from "central-icons";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Skeleton } from "@multi/ui/skeleton";
import { usePretextOneLine } from "~/hooks/use-composer-pretext-one-line";
import {
  displayModelName,
  displayProviderName,
  filterRuntimeModels,
  type RuntimeModelItem,
} from "~/lib/runtime-models";
import { cn } from "~/lib/utils";

function PretextOneLine(props: {
  text: string;
  className?: string;
  fontPx?: number;
  lineHeightPx?: number;
}) {
  const { ref, shown, fallback } = usePretextOneLine({
    text: props.text,
    ...(props.fontPx !== undefined ? { fontPx: props.fontPx } : {}),
    ...(props.lineHeightPx !== undefined ? { lineHeightPx: props.lineHeightPx } : {}),
  });
  return (
    <span ref={ref} className={cn(props.className, fallback && "truncate")}>
      {shown}
    </span>
  );
}

/** `thinkingLevel`: `off` disables extended reasoning; other values set depth. */
const thinkingOptions: { label: string; value: ThinkingLevel }[] = [
  { label: "Off", value: "off" },
  { label: "Minimal", value: "minimal" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Extra High", value: "xhigh" },
];

function thinkingDetailLabel(level: ThinkingLevel) {
  const row = thinkingOptions.find((o) => o.value === level);
  return row?.label ?? level;
}

function clamp(level: ThinkingLevel, xhigh: boolean) {
  if (level === "xhigh" && !xhigh) return "high";
  return level;
}

type ModelPickerSelection = {
  model: HarnessModelRef | null;
  fastMode?: boolean;
  thinkingLevel?: ThinkingLevel;
};

function stopMenuSearchBubbling(e: React.KeyboardEvent) {
  e.stopPropagation();
}

export type ModelPickerHandle = {
  open: () => void;
};

export const ModelPicker = forwardRef<
  ModelPickerHandle,
  {
    items: readonly RuntimeModelItem[];
    selection: ModelPickerSelection;
    disabled?: boolean;
    loading?: boolean;
    status?: "loading" | "ready" | "error";
    variant?: "hero" | "dock" | "settings";
    onSelect: (item: RuntimeModelItem) => void;
    onFastMode?: (on: boolean) => void;
    onThinkingLevel?: (level: ThinkingLevel) => void;
    onAddModels?: () => void;
  }
>(function ModelPicker(props, ref) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmMax, setConfirmMax] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const list = useMemo(() => filterRuntimeModels(props.items, query), [props.items, query]);
  const cur = useMemo(
    () =>
      props.items.find(
        (item) =>
          item.provider === props.selection.model?.provider &&
          item.id === props.selection.model?.id,
      ),
    [props.items, props.selection.model],
  );
  const xhigh = Boolean(cur?.supportsXhigh);
  useEffect(() => {
    if (open) return;
    setQuery("");
    setConfirmMax(false);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const thinkingValue = clamp(props.selection.thinkingLevel ?? "off", xhigh);
  const fastValue = props.selection.fastMode ? "on" : "off";
  const status = props.status ?? (props.loading ? "loading" : "ready");
  const busy = status === "loading";
  const failed = status === "error";
  const idle = !props.disabled && !busy && !failed && props.items.length > 0;
  const locked = (props.disabled ?? false) || busy || failed;
  const showFast = Boolean(props.onFastMode && cur?.supportsFastMode);
  const showThinking = Boolean(props.onThinkingLevel && cur?.reasoning);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        if (locked || props.items.length === 0) return;
        if (open) {
          inputRef.current?.focus();
          return;
        }
        const node = triggerRef.current;
        if (!node) {
          setOpen(true);
          return;
        }
        node.focus();
        node.click();
      },
    }),
    [locked, open, props.items.length],
  );

  const triggerLabel = (() => {
    if (cur != null) {
      return displayModelName(cur.name || cur.id);
    }
    if (props.selection.model?.id) {
      return displayModelName(props.selection.model.name ?? props.selection.model.id);
    }
    if (busy) {
      return "Loading models";
    }
    if (failed) {
      return "Models unavailable";
    }
    return "Auto";
  })();

  const side = props.variant === "dock" ? "top" : "bottom";
  const align = props.variant === "settings" ? "start" : "end";
  const settings = props.variant === "settings";

  return (
    <Menu.Root
      open={open}
      onOpenChange={(next) => {
        if (locked) {
          setOpen(false);
          return;
        }
        setOpen(next);
      }}
    >
      <Menu.Trigger
        ref={triggerRef}
        type="button"
        data-size="sm"
        aria-label={`Model: ${triggerLabel}${props.onThinkingLevel ? `, thinking ${thinkingDetailLabel(thinkingValue)}` : ""}${showFast ? `, fast mode ${fastValue}` : ""}`}
        disabled={!idle}
        className={cn(
          "ui-model-picker__trigger inline-flex min-w-0 gap-1.5 rounded-full border text-left text-[12px]/[16px] outline-none transition-colors focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none",
          settings
            ? "h-auto min-h-7 w-full max-w-full flex-col items-stretch gap-0.5 border-cursor-stroke-tertiary bg-cursor-bg-quinary py-1 pl-2 pr-1 hover:border-cursor-stroke-secondary hover:bg-cursor-bg-quaternary"
            : "h-6 max-w-[min(100%,240px)] items-center border-transparent bg-transparent px-1.5 py-0 hover:bg-cursor-bg-quaternary",
          cur != null || props.selection.model?.id
            ? "text-foreground/90"
            : "text-muted-foreground/70",
          !idle && "opacity-50",
        )}
      >
        {busy && !props.selection.model?.id ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className={cn("h-3 rounded bg-muted/45", settings ? "w-28" : "w-20")} />
            {settings && props.onThinkingLevel ? (
              <Skeleton className="h-2 w-20 rounded bg-muted/35" />
            ) : null}
          </div>
        ) : (
          <>
            <div className={cn("flex min-w-0 items-center gap-1", settings && "w-full")}>
              <span className="ui-model-picker__trigger-text min-w-0 flex-1 overflow-hidden">
                <PretextOneLine
                  text={triggerLabel}
                  className={cn(
                    "block w-full min-w-0 text-left text-[12px]/[16px]",
                    cur != null || props.selection.model?.id
                      ? "text-foreground/90"
                      : "text-muted-foreground/70",
                  )}
                />
              </span>
              {thinkingValue === "xhigh" ? (
                <span className="inline-flex h-4 shrink-0 items-center rounded-[4px] bg-cursor-bg-tertiary px-1 text-[9px]/[12px] font-semibold text-cursor-text-secondary">
                  MAX
                </span>
              ) : null}
              {locked ? (
                <LockIcon className="size-3 shrink-0 text-cursor-text-tertiary" aria-hidden />
              ) : null}
              <IconChevronRight
                className="size-3 shrink-0 rotate-90 text-cursor-text-tertiary"
                aria-hidden
              />
            </div>
            {settings && (props.onThinkingLevel || showFast) ? (
              <span className="w-full truncate text-left text-caption text-muted-foreground/80">
                {props.onThinkingLevel ? `Thinking: ${thinkingDetailLabel(thinkingValue)}` : null}
                {props.onThinkingLevel && showFast ? " • " : null}
                {showFast ? `Fast: ${fastValue === "on" ? "On" : "Off"}` : null}
              </span>
            ) : null}
          </>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="z-50 outline-none ring-0"
          side={side}
          align={align}
          sideOffset={2}
        >
          <Menu.Popup
            className={cn(
              "multi-slash-menu-popup flex max-h-[min(var(--available-height),20rem)] w-[min(18rem,var(--available-width))] min-w-[15rem] max-w-[18rem] flex-col overflow-hidden rounded-[12px] border border-cursor-stroke-tertiary bg-cursor-bg-elevated font-multi text-[12px]/[16px] text-cursor-text-primary shadow-multi-popup outline-none ring-0 backdrop-blur-xl focus:outline-none focus-visible:outline-none",
            )}
          >
            <div className="shrink-0 border-b border-cursor-stroke-tertiary px-1.5 py-1.5">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={stopMenuSearchBubbling}
                placeholder="Search models"
                className="flex h-6 w-full rounded-[6px] border-0 bg-cursor-bg-quinary px-2 text-[12px]/[16px] text-cursor-text-primary outline-none ring-0 placeholder:text-cursor-text-quaternary focus:outline-none focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            {confirmMax ? (
              <div className="flex flex-col gap-2 border-b border-cursor-stroke-tertiary px-3 py-2.5">
                <div className="text-[12px]/[16px] font-medium text-cursor-text-primary">
                  Enable MAX Mode?
                </div>
                <div className="text-[11px]/[14px] text-cursor-text-tertiary">
                  MAX uses the deepest reasoning level for this model.
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                  <button
                    type="button"
                    className="h-6 rounded-[5px] px-2 text-[12px]/[16px] text-cursor-text-secondary hover:bg-cursor-bg-quaternary hover:text-cursor-text-primary"
                    onClick={() => setConfirmMax(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="h-6 rounded-[5px] bg-cursor-bg-tertiary px-2 text-[12px]/[16px] font-medium text-cursor-text-primary hover:bg-cursor-bg-secondary"
                    data-action="variant_selected"
                    onClick={() => {
                      props.onThinkingLevel?.("xhigh");
                      setConfirmMax(false);
                    }}
                  >
                    Enable MAX
                  </button>
                </div>
              </div>
            ) : null}
            {showThinking ? (
              <button
                type="button"
                disabled={!xhigh || locked}
                onClick={() => {
                  if (thinkingValue === "xhigh") {
                    props.onThinkingLevel?.("medium");
                    return;
                  }
                  setConfirmMax(true);
                }}
                className={cn(
                  cursorMenuItemClassName,
                  "w-full rounded-none border-b border-cursor-stroke-tertiary px-2 text-left text-cursor-text-primary disabled:cursor-default disabled:opacity-50",
                )}
                aria-pressed={thinkingValue === "xhigh"}
                data-action="toggle_changed"
              >
                <span className="min-w-0 flex-1">MAX Mode</span>
                <span
                  className={cn(
                    "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-px transition-colors",
                    thinkingValue === "xhigh" ? "bg-primary" : "bg-cursor-bg-tertiary",
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "size-3.5 rounded-full bg-background shadow-sm transition-transform",
                      thinkingValue === "xhigh" && "translate-x-3",
                    )}
                  />
                </span>
              </button>
            ) : null}
            {list.length === 0 ? (
              <div className="shrink-0 px-4 py-3 text-center text-[12px]/[16px] text-cursor-text-tertiary">
                {failed
                  ? "Unable to load models."
                  : props.items.length === 0
                    ? "No models available yet."
                    : "No matching models."}
              </div>
            ) : null}
            {list.length > 0 ? (
              <div className="max-h-[min(17rem,calc(min(var(--available-height,100dvh),20rem)-5.25rem))] min-h-0 overflow-y-auto overscroll-contain pb-1 pt-0">
                {list.map((item) => {
                  const selected =
                    item.provider === props.selection.model?.provider &&
                    item.id === props.selection.model?.id;
                  const modeLabel = item.reasoning
                    ? selected
                      ? thinkingDetailLabel(thinkingValue)
                      : "Reasoning"
                    : undefined;
                  return (
                    <Menu.Item
                      key={item.key}
                      label={`${displayModelName(item.name || item.id)} ${displayProviderName(item.provider)}`}
                      closeOnClick={false}
                      onClick={() => {
                        props.onSelect(item);
                        setOpen(false);
                        setQuery("");
                      }}
                      data-action="model_selected"
                      className={cn(
                        cursorMenuItemClassName,
                        "group mx-1 px-1.5",
                        selected && "bg-cursor-bg-tertiary text-cursor-text-primary",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="min-w-0 flex-1 overflow-hidden">
                          <PretextOneLine
                            text={displayModelName(item.name || item.id)}
                            className={cn(
                              "block w-full min-w-0 text-left",
                              cursorMenuPrimaryTextClassName,
                            )}
                          />
                        </span>
                        <span
                          className={cn(
                            "max-w-[5rem] shrink-0 text-muted-foreground/70",
                            cursorMenuMetaTextClassName,
                          )}
                        >
                          {displayProviderName(item.provider)}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          {item.reasoning ? (
                            <span className={cursorMenuIconSlotClassName} title={modeLabel}>
                              <IconBrain
                                className="size-3 shrink-0 text-muted-foreground/75"
                                aria-hidden
                              />
                            </span>
                          ) : null}
                          {selected ? (
                            <IconCheckmark1Small className="size-3.5 shrink-0 text-muted-foreground/70" />
                          ) : null}
                        </div>
                      </div>
                    </Menu.Item>
                  );
                })}
              </div>
            ) : null}
            {props.onAddModels ? (
              <>
                <Menu.Separator className={cn(cursorMenuSeparatorClassName, "mx-0 my-0")} />
                <button
                  type="button"
                  className={cn(cursorMenuItemClassName, "mx-1 mb-1 w-[calc(100%-0.5rem)] px-2")}
                  onClick={() => {
                    setOpen(false);
                    props.onAddModels?.();
                  }}
                  data-action="open-model-settings"
                >
                  <span className="min-w-0 flex-1 text-left">Add Models</span>
                  <IconChevronRight className="size-3 shrink-0 text-cursor-text-tertiary" />
                </button>
              </>
            ) : null}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
});
ModelPicker.displayName = "ModelPicker";
