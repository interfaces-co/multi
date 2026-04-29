/** @jsxImportSource solid-js */
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  type Accessor,
} from "solid-js";

import type { SidebarSectionModel } from "~/lib/sidebar-chat-view-model";

const initialMaxVisible = 5;
const pageStep = 8;

export interface SolidAgentListProps {
  sections: SidebarSectionModel[];
  selectedId: string | null;
  onSelectAgent: (id: string) => void;
  onNewAgent?: ((cwd: string) => void) | undefined;
  loading?: boolean;
  error?: boolean;
}

function minVisibleForSelection(
  items: readonly SidebarSectionModel["items"][number][],
  selectedId: string | null,
) {
  if (items.length === 0) return 0;
  const firstPage = Math.min(items.length, initialMaxVisible);
  if (!selectedId) return firstPage;
  const i = items.findIndex((item) => item.id === selectedId);
  if (i < 0) return firstPage;
  return Math.min(items.length, Math.max(firstPage, i + 1));
}

function StatusDot(props: { item: SidebarSectionModel["items"][number] }) {
  return (
    <Switch>
      <Match when={props.item.kind === "draft"}>
        <span
          class="size-[11px] shrink-0 rounded-full border border-[var(--cursor-icon-tertiary)]"
          aria-hidden
        />
      </Match>
      <Match when={props.item.state === "running"}>
        <span
          class="relative flex size-[5.5px] shrink-0 items-center justify-center rounded-full bg-[var(--cursor-green)]"
          aria-hidden
        >
          <span class="absolute size-[11px] animate-ping rounded-full bg-[color-mix(in_srgb,var(--cursor-green)_38%,transparent)]" />
        </span>
      </Match>
      <Match when={props.item.state === "error"}>
        <span class="size-[5.5px] shrink-0 rounded-full bg-[var(--cursor-red)]" aria-hidden />
      </Match>
      <Match when={props.item.kind === "thread" && props.item.unread}>
        <span class="size-[5.5px] shrink-0 rounded-full bg-[var(--cursor-blue)]" aria-hidden />
      </Match>
      <Match when>
        <span
          class="size-[5.5px] shrink-0 rounded-full bg-[var(--cursor-icon-tertiary)]"
          aria-hidden
        />
      </Match>
    </Switch>
  );
}

function AgentCell(props: {
  item: SidebarSectionModel["items"][number];
  selected: boolean;
  onSelectAgent: (id: string) => void;
}) {
  return (
    <button
      type="button"
      class="agent-sidebar-cell font-multi flex min-h-0 w-full items-center justify-start gap-3 rounded-multi-control border border-transparent px-1.5 py-[5px] text-left text-[12px]/[16px] text-muted-foreground transition-colors hover:bg-multi-hover hover:text-foreground data-[selected=true]:border-multi-border/90 data-[selected=true]:bg-multi-active data-[selected=true]:text-foreground"
      data-agent-sidebar-cell=""
      data-selected={props.selected ? "true" : "false"}
      data-chat-item=""
      onClick={() => props.onSelectAgent(props.item.id)}
    >
      <StatusDot item={props.item} />
      <span class="agent-sidebar-cell-text min-w-0 flex-1 truncate">{props.item.title}</span>
      <span class="agent-sidebar-cell-subtitle shrink-0 text-detail text-muted-foreground/50">
        {props.item.ago}
      </span>
    </button>
  );
}

function Section(props: {
  section: SidebarSectionModel;
  selectedId: string | null;
  onSelectAgent: (id: string) => void;
  onNewAgent?: ((cwd: string) => void) | undefined;
}) {
  const uid = createUniqueId();
  const labelId = `solid-agent-section-label-${uid}`;
  const panelId = `solid-agent-section-panel-${uid}`;
  const [open, setOpen] = createSignal(true);
  const [extra, setExtra] = createSignal(0);
  const items = () => props.section.items;
  const minVisible = createMemo(() => minVisibleForSelection(items(), props.selectedId));

  createEffect(() => {
    const need = Math.max(0, minVisible() - initialMaxVisible);
    const min = need === 0 ? 0 : Math.ceil(need / pageStep);
    setExtra((count) => Math.max(count, min));
  });

  const visible = createMemo(() => {
    const list = items();
    const firstPage = Math.min(list.length, initialMaxVisible);
    const rawVisible = Math.min(list.length, initialMaxVisible + extra() * pageStep);
    let next = Math.max(rawVisible, minVisible());
    if (list.length - next === 1 && next < list.length) next = list.length;
    return Math.max(next, firstPage);
  });

  const showMore = createMemo(
    () =>
      items().length > Math.min(items().length, initialMaxVisible) && visible() < items().length,
  );

  return (
    <section class="agent-sidebar-section min-w-0 w-full" data-agent-sidebar-section="">
      <div class="agent-sidebar-section-heading flex min-h-6 min-w-0 w-full items-center gap-0 px-1.5">
        <button
          id={labelId}
          type="button"
          aria-expanded={open()}
          aria-controls={open() ? panelId : undefined}
          onClick={() => setOpen(!open())}
          class={`agent-sidebar-section-toggle relative flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-multi-control px-1.5 py-0.5 text-left font-multi sidebar-label-track outline-none touch-manipulation transition-[color] duration-150 ease motion-reduce:transition-none pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
            props.section.active
              ? "text-foreground/90 [@media(hover:hover)]:hover:text-foreground"
              : "text-muted-foreground/60 [@media(hover:hover)]:hover:text-muted-foreground"
          }`}
        >
          <span
            class={`agent-sidebar-section-chevron size-3 shrink-0 text-muted-foreground/50 transition-transform duration-150 ease-out motion-reduce:transition-none ${
              open() ? "" : "-rotate-90"
            }`}
            aria-hidden
          >
            ▾
          </span>
          <span class="min-w-0 flex-1 truncate">{props.section.label}</span>
        </button>
        <Show when={props.onNewAgent}>
          {(onNewAgent) => (
            <button
              type="button"
              onClick={() => onNewAgent()(props.section.cwd)}
              aria-label={`New agent in ${props.section.label}`}
              title={`New agent in ${props.section.label}`}
              class={`agent-sidebar-section-new relative flex size-5.5 shrink-0 cursor-pointer items-center justify-center rounded-multi-control outline-none touch-manipulation transition-[color,background-color] duration-150 ease motion-reduce:transition-none pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                props.section.active
                  ? "text-foreground/65 [@media(hover:hover)]:hover:bg-multi-hover [@media(hover:hover)]:hover:text-foreground"
                  : "text-muted-foreground/55 [@media(hover:hover)]:hover:bg-multi-hover [@media(hover:hover)]:hover:text-muted-foreground"
              }`}
            >
              <span aria-hidden>+</span>
            </button>
          )}
        </Show>
      </div>
      <Show when={open()}>
        <div
          id={panelId}
          class="agent-sidebar-section-items flex flex-col gap-px"
          role="region"
          aria-labelledby={labelId}
        >
          <For each={items().slice(0, visible())}>
            {(item) => (
              <AgentCell
                item={item}
                selected={props.selectedId === item.id}
                onSelectAgent={props.onSelectAgent}
              />
            )}
          </For>
          <Show when={showMore()}>
            <button
              type="button"
              onClick={() => setExtra((count) => count + 1)}
              class="agent-sidebar-more relative flex min-h-6 w-full cursor-pointer items-center gap-1.5 rounded-multi-control px-1.5 py-0.5 text-left font-multi text-[11px]/[14px] text-muted-foreground/65 outline-none touch-manipulation transition-[color,background-color] duration-150 ease motion-reduce:transition-none pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background [@media(hover:hover)]:hover:bg-multi-hover [@media(hover:hover)]:hover:text-muted-foreground"
            >
              <span class="size-3 shrink-0 opacity-55" aria-hidden>
                ⋯
              </span>
              <span class="min-w-0">More</span>
            </button>
          </Show>
        </div>
      </Show>
    </section>
  );
}

function SkeletonRows() {
  return (
    <div class="agent-sidebar-list flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-2 py-1.5 [scrollbar-gutter:stable]">
      <For each={[0, 1]}>
        {(i) => (
          <div class="flex flex-col gap-2">
            <div
              class="h-3 w-16 animate-pulse rounded-multi-control bg-[var(--cursor-bg-tertiary)]"
              data-skeleton={i}
            />
            <div class="flex flex-col gap-1">
              <For each={[0, 1, 2]}>
                {(j) => (
                  <div
                    class="h-8 w-full animate-pulse rounded-multi-control bg-[var(--cursor-bg-tertiary)]"
                    data-skeleton={j}
                  />
                )}
              </For>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

export function SolidAgentList(propsAccessor: Accessor<SolidAgentListProps>) {
  const props = propsAccessor;
  const sections = createMemo(() => props().sections);

  return (
    <Show when={!props().loading} fallback={<SkeletonRows />}>
      <Show
        when={!props().error}
        fallback={
          <p class="px-2 py-4 text-detail text-muted-foreground/60">
            Unable to load chats right now.
          </p>
        }
      >
        <Show
          when={sections().length > 0}
          fallback={
            <p class="px-2 py-4 text-detail text-muted-foreground/60">
              No chats yet. Start a chat to begin.
            </p>
          }
        >
          <div class="agent-sidebar-list flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-2 py-1.5 [scrollbar-gutter:stable]">
            <For each={sections()}>
              {(section) => (
                <Section
                  section={section}
                  selectedId={props().selectedId}
                  onSelectAgent={props().onSelectAgent}
                  onNewAgent={props().onNewAgent}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
    </Show>
  );
}
