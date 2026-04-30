/**
 * Shared slash and @mention launcher.
 * Uses Base UI Popover because the textarea stays the real input owner.
 *
 * Pixel targets aligned with `ui-menu` / `ui-slash-menu` reference layout:
 *   root        font-size:12px  line-height:16px
 *   content     padding:4px
 *   list        gap:1px
 *   row         padding:3px 4px  gap:6px  border-radius:4px
 *   row:focus   bg:quaternary
 *   icon        12×16
 *   description 11px/14px  tertiary
 *   section     11px/14px  tertiary  padding:4px
 *   highlight   font-weight:600
 */
import type { ShellFileHit, ShellFilePreview } from "~/lib/ui-session-types";
import { Popover } from "@base-ui/react/popover";
import {
  cursorMenuIconSlotClassName,
  cursorMenuItemClassName,
  cursorMenuLabelClassName,
  cursorMenuMetaTextClassName,
  cursorMenuPrimaryTextClassName,
  cursorMenuPopupClassName,
} from "@multi/ui/menu";
import {
  IconBuildingBlocks,
  IconChevronRight,
  IconFileBend,
  IconFolder1,
  IconImages1,
  IconLightning,
} from "central-icons";
import type { ReactNode, RefObject } from "react";
import { cn } from "~/lib/utils";
import { ScrollArea } from "@multi/ui/scroll-area";
import { ComposerFilePreview } from "./file-preview";
import type { SlashItem, SlashMenuRow } from "./slash-registry";

function kindGlyph(kind: SlashItem["kind"]) {
  if (kind === "skill") return IconBuildingBlocks;
  return IconLightning;
}

/** Slash menu query highlight — semibold matched segment (`ui-slash-menu__highlight`). */
function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-primary">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

function highlightPath(path: string, query: string): ReactNode {
  if (!query) return path;
  const lower = path.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return path;
  return (
    <>
      {path.slice(0, idx)}
      <span className="font-semibold text-foreground/80">{path.slice(idx, idx + q.length)}</span>
      {path.slice(idx + q.length)}
    </>
  );
}

function dirOf(path: string): string | null {
  const cut = path.lastIndexOf("/");
  return cut > 0 ? path.slice(0, cut) : null;
}

export function ComposerTokenMenu(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<Element | null> | null;
  variant: "hero" | "dock";
  mode: "slash" | "file";
  query: string;
  slashRows: SlashMenuRow[];
  slashActive: number;
  onSlashHover: (optionIndex: number) => void;
  onSlashPick: (item: SlashItem) => void;
  onSlashShowMore: (groupKey: string) => void;
  hits: ShellFileHit[];
  fileActive: number;
  onFileHover: (i: number) => void;
  onFilePick: (hit: ShellFileHit) => void;
  filePick: ShellFileHit | null;
  preview: ShellFilePreview | null;
  loading: boolean;
}) {
  const side = props.variant === "dock" ? "top" : "bottom";
  const anchor = props.anchor ?? undefined;

  return (
    <Popover.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor}
          side={side}
          align="start"
          sideOffset={8}
          className="z-50 outline-none"
        >
          {/* Root menu shell: 12px/16px, elevated surface, soft shadow */}
          <Popover.Popup
            data-slot="popover-token-menu"
            initialFocus={false}
            finalFocus={false}
            className={cn(
              "multi-composer-token-menu",
              "origin-[var(--transform-origin)]",
              cursorMenuPopupClassName,
              "w-[min(320px,calc(100vw-2rem))] text-[12px]/[16px] select-none",
            )}
          >
            {props.mode === "file" ? <FilePane {...props} /> : <SlashPane {...props} />}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ── Slash mode ───────────────────────────────────────────── */

function SlashPane(props: {
  query: string;
  slashRows: SlashMenuRow[];
  slashActive: number;
  onSlashHover: (optionIndex: number) => void;
  onSlashPick: (item: SlashItem) => void;
  onSlashShowMore: (groupKey: string) => void;
}) {
  return (
    <div className="max-h-72 min-h-0 overflow-y-auto overscroll-contain">
      {/* Menu content: 4px padding */}
      <div className="flex flex-col gap-px p-1" role="listbox" aria-label="Slash commands">
        {props.slashRows.map((row) => {
          if (row.kind === "header") {
            return (
              <div
                key={row.key}
                /* Section title: 11px/14px tertiary */
                className={cursorMenuLabelClassName}
                role="presentation"
              >
                {row.label}
              </div>
            );
          }
          if (row.kind === "more") {
            return (
              <button
                key={row.key}
                type="button"
                className={cn(
                  cursorMenuItemClassName,
                  "w-full text-left text-[11px]/[14px] text-cursor-text-tertiary hover:text-cursor-text-secondary",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  props.onSlashShowMore(row.key.replace(/:more$/, ""));
                }}
              >
                Show <span className="text-cursor-text-secondary">{row.count}</span> more
              </button>
            );
          }
          const active = row.optionIndex === props.slashActive;
          const Glyph = kindGlyph(row.item.kind);
          return (
            <button
              key={`${row.item.id}:${row.optionIndex}`}
              type="button"
              role="option"
              aria-selected={active}
              data-highlighted={active ? "" : undefined}
              /* Menu row: 3px×4px padding, 6px gap, 4px radius */
              className={cn(
                cursorMenuItemClassName,
                "w-full text-left motion-reduce:transition-none",
                active
                  ? "bg-cursor-bg-tertiary text-cursor-text-primary"
                  : "text-cursor-text-secondary hover:bg-cursor-bg-quaternary",
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                props.onSlashHover(row.optionIndex);
                props.onSlashPick(row.item);
              }}
              onMouseEnter={() => props.onSlashHover(row.optionIndex)}
            >
              {/* Leading icon slot: 12×16 secondary */}
              <span className={cursorMenuIconSlotClassName}>
                <Glyph className="size-3" />
              </span>
              {/* Title row: 8px gap, flex-1 */}
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {/* Primary title, truncate */}
                <span className={cursorMenuPrimaryTextClassName}>
                  {row.item.kind === "skill" ? "" : "/"}
                  {highlightMatch(row.item.name, props.query)}
                </span>
                {/* Inline description: tertiary, truncate */}
                {row.item.description ? (
                  <span className={cn("min-w-0 flex-1", cursorMenuMetaTextClassName)}>
                    {row.item.description}
                  </span>
                ) : null}
              </span>
              {/* Trailing pill: tertiary, max 180px */}
              <span
                className={cn(
                  "max-w-[180px] shrink-0 text-cursor-text-quaternary",
                  cursorMenuMetaTextClassName,
                )}
              >
                {row.item.pill}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── File / @mention mode ─────────────────────────────────── */

function FilePane(props: {
  query: string;
  hits: ShellFileHit[];
  fileActive: number;
  onFileHover: (i: number) => void;
  onFilePick: (hit: ShellFileHit) => void;
  filePick: ShellFileHit | null;
  preview: ShellFilePreview | null;
  loading: boolean;
}) {
  return (
    <div className="grid bg-multi-border/20 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
      <div className="min-w-0 border-b border-multi-border/20 md:border-r md:border-b-0">
        <ScrollArea className="max-h-74">
          {/* Menu content: 4px padding */}
          <div
            className="flex flex-col gap-px p-1"
            role="listbox"
            aria-label="File mentions"
            aria-busy={props.loading}
          >
            {props.loading ? (
              <div className="px-1 py-2 text-[11px]/[14px] text-cursor-text-tertiary">Loading…</div>
            ) : (
              props.hits.map((item, i) => {
                const active = i === props.fileActive;
                const dir = dirOf(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-highlighted={active ? "" : undefined}
                    /* Menu row: 3px×4px padding, 6px gap, 4px radius */
                    className={cn(
                      cursorMenuItemClassName,
                      "w-full text-left motion-reduce:transition-none",
                      active
                        ? "multi-composer-object-row--active"
                        : "text-cursor-text-secondary hover:bg-cursor-bg-quaternary",
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      props.onFileHover(i);
                      props.onFilePick(item);
                    }}
                    onMouseEnter={() => props.onFileHover(i)}
                  >
                    {/* Leading icon slot: 12×16 */}
                    <span
                      className={cn(
                        cursorMenuIconSlotClassName,
                        active
                          ? "text-[color:var(--multi-composer-object-fg-muted)]"
                          : "text-muted-foreground/60",
                      )}
                    >
                      {item.kind === "dir" ? (
                        <IconFolder1 className="size-3" />
                      ) : item.kind === "image" ? (
                        <IconImages1 className="size-3" />
                      ) : (
                        <IconFileBend className="size-3" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 items-baseline gap-1">
                      <span
                        className={cn(
                          "shrink-0",
                          cursorMenuPrimaryTextClassName,
                          active ? "text-current" : "text-foreground",
                        )}
                      >
                        {highlightMatch(item.name, props.query)}
                      </span>
                      {dir ? (
                        <span
                          className={cn(
                            "min-w-0",
                            cursorMenuMetaTextClassName,
                            active
                              ? "text-[color:var(--multi-composer-object-fg-muted)]"
                              : "text-muted-foreground/40",
                          )}
                          style={{ direction: "rtl", textAlign: "left" }}
                        >
                          {highlightPath(dir, props.query)}
                        </span>
                      ) : null}
                    </span>
                    {item.kind === "dir" ? (
                      <IconChevronRight
                        className={cn(
                          "size-2.5 shrink-0",
                          active
                            ? "text-[color:var(--multi-composer-object-fg-muted)]"
                            : "text-muted-foreground/45",
                        )}
                      />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
      <ComposerFilePreview item={props.filePick} preview={props.preview} />
    </div>
  );
}
