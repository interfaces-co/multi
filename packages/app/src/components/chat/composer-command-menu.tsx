import {
  type ProjectEntry,
  type ProviderDriverKind,
  type ServerProviderSkill,
  type ServerProviderSlashCommand,
} from "@multi/contracts";
import {
  BotIcon,
  BoxIcon,
  ListTodoIcon,
  SlidersHorizontalIcon,
  type LucideIcon,
} from "lucide-react";
import { memo, useLayoutEffect, useMemo, useRef } from "react";

import { type ComposerSlashCommand, type ComposerTriggerKind } from "../../composer-logic";
import { formatProviderSkillInstallSource } from "~/provider-skill-presentation";
import { cn } from "~/lib/utils";
import {
  Command,
  CommandGroup,
  CommandGroupLabel,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@multi/ui/command";
import { VscodeEntryIcon } from "./vscode-entry-icon";

export type ComposerCommandItem =
  | {
      id: string;
      type: "path";
      path: string;
      pathKind: ProjectEntry["kind"];
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "slash-command";
      command: ComposerSlashCommand;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "provider-slash-command";
      provider: ProviderDriverKind;
      command: ServerProviderSlashCommand;
      label: string;
      description: string;
    }
  | {
      id: string;
      type: "skill";
      provider: ProviderDriverKind;
      skill: ServerProviderSkill;
      label: string;
      description: string;
    };

type ComposerCommandGroup = {
  id: string;
  label: string | null;
  items: ComposerCommandItem[];
};
type ComposerCommandMenuKind = "slash" | "mentions";

function getSlashCommandIcon(command: ComposerSlashCommand): LucideIcon {
  if (command === "model") return BoxIcon;
  if (command === "plan") return ListTodoIcon;
  return BotIcon;
}

function getSlashCommandTertiaryText(command: ComposerSlashCommand): string {
  if (command === "model") return "Select Model";
  if (command === "plan") return "Plan Mode";
  return "Build Mode";
}

function SkillGlyph(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function groupCommandItems(
  items: ComposerCommandItem[],
  triggerKind: ComposerTriggerKind | null,
  groupSlashCommandSections: boolean,
): ComposerCommandGroup[] {
  if (triggerKind === "skill") {
    return items.length > 0 ? [{ id: "skills", label: "Skills", items }] : [];
  }
  if (triggerKind === "path") {
    return items.length > 0 ? [{ id: "files", label: "Files & Folders", items }] : [];
  }
  if (triggerKind !== "slash-command" || !groupSlashCommandSections) {
    return [{ id: "default", label: null, items }];
  }

  const modeItems = items.filter(
    (item) => item.type === "slash-command" && item.command !== "model",
  );
  const openItems = items.filter(
    (item) => item.type === "slash-command" && item.command === "model",
  );
  const providerItems = items.filter((item) => item.type === "provider-slash-command");

  const groups: ComposerCommandGroup[] = [];
  if (modeItems.length > 0) {
    groups.push({ id: "modes", label: "Modes", items: modeItems });
  }
  if (openItems.length > 0) {
    groups.push({ id: "open", label: "Open", items: openItems });
  }
  if (providerItems.length > 0) {
    groups.push({ id: "commands", label: "Commands", items: providerItems });
  }
  return groups;
}

export const ComposerCommandMenu = memo(function ComposerCommandMenu(props: {
  items: ComposerCommandItem[];
  resolvedTheme: "light" | "dark";
  isLoading: boolean;
  ariaLabel: "Slash commands" | "Mentions";
  menuKind: ComposerCommandMenuKind;
  triggerKind: ComposerTriggerKind | null;
  groupSlashCommandSections?: boolean;
  emptyStateText?: string;
  activeItemId: string | null;
  onHighlightedItemChange: (itemId: string | null) => void;
  onSelect: (item: ComposerCommandItem) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(
    () =>
      groupCommandItems(props.items, props.triggerKind, props.groupSlashCommandSections ?? true),
    [props.groupSlashCommandSections, props.items, props.triggerKind],
  );

  useLayoutEffect(() => {
    if (!props.activeItemId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-composer-item-id="${CSS.escape(props.activeItemId)}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [props.activeItemId]);

  return (
    <Command
      aria-label={props.ariaLabel}
      autoHighlight={false}
      mode="none"
      onItemHighlighted={(highlightedValue) => {
        props.onHighlightedItemChange(
          typeof highlightedValue === "string" ? highlightedValue : null,
        );
      }}
    >
      <div
        ref={listRef}
        className={cn(
          "multi-composer-token-menu relative overflow-hidden ui-slash-menu__content ui-slash-menu__content--glass",
          props.menuKind === "slash" ? "ui-slash-menu" : "mentions-menu mentions-menu__content",
        )}
        data-menu-kind={props.menuKind}
        data-variant="glass"
      >
        <CommandList className="max-h-[342px]">
          {groups.map((group, groupIndex) => (
            <div key={group.id}>
              {groupIndex > 0 ? <CommandSeparator className="my-0.5" /> : null}
              <CommandGroup>
                {group.label ? (
                  <CommandGroupLabel className="multi-composer-token-menu__group-label">
                    {group.label}
                  </CommandGroupLabel>
                ) : null}
                {group.items.map((item) => (
                  <ComposerCommandMenuItem
                    key={item.id}
                    item={item}
                    resolvedTheme={props.resolvedTheme}
                    isActive={props.activeItemId === item.id}
                    onHighlight={props.onHighlightedItemChange}
                    onSelect={props.onSelect}
                  />
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
        {props.items.length === 0 ? (
          <div className="multi-composer-token-menu__empty">
            {props.triggerKind === "skill" ? (
              <CommandGroup>
                <CommandGroupLabel className="multi-composer-token-menu__group-label px-0! pt-0!">
                  Skills
                </CommandGroupLabel>
                <p className="multi-composer-token-menu__empty-text">
                  {props.isLoading
                    ? "Searching workspace skills..."
                    : (props.emptyStateText ??
                      "No skills found. Try / to browse provider commands.")}
                </p>
              </CommandGroup>
            ) : (
              <p className="multi-composer-token-menu__empty-text">
                {props.isLoading
                  ? "Searching workspace files..."
                  : (props.emptyStateText ??
                    (props.triggerKind === "path"
                      ? "No matching files or folders."
                      : "No matching command."))}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Command>
  );
});

const ComposerCommandMenuItem = memo(function ComposerCommandMenuItem(props: {
  item: ComposerCommandItem;
  resolvedTheme: "light" | "dark";
  isActive: boolean;
  onHighlight: (itemId: string | null) => void;
  onSelect: (item: ComposerCommandItem) => void;
}) {
  const skillSourceLabel =
    props.item.type === "skill" ? formatProviderSkillInstallSource(props.item.skill) : null;
  const SlashIcon =
    props.item.type === "slash-command" ? getSlashCommandIcon(props.item.command) : null;
  const tertiaryText =
    props.item.type === "slash-command"
      ? getSlashCommandTertiaryText(props.item.command)
      : props.item.type === "provider-slash-command"
        ? "Command"
        : skillSourceLabel;

  return (
    <CommandItem
      value={props.item.id}
      data-composer-item-id={props.item.id}
      data-is-selected={props.isActive ? "" : undefined}
      data-menu-item-type={props.item.type}
      className={cn(
        "multi-composer-token-menu__item ui-slash-menu__item cursor-pointer select-none hover:bg-transparent hover:text-inherit data-highlighted:bg-transparent data-highlighted:text-inherit",
        props.isActive && "multi-composer-token-menu__item--active",
      )}
      onMouseMove={() => {
        if (!props.isActive) props.onHighlight(props.item.id);
      }}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={() => {
        props.onSelect(props.item);
      }}
    >
      {props.item.type === "path" ? (
        <VscodeEntryIcon
          pathValue={props.item.path}
          kind={props.item.pathKind}
          theme={props.resolvedTheme}
        />
      ) : null}
      {SlashIcon ? (
        <SlashIcon className="multi-composer-token-menu__icon ui-slash-menu__item-icon size-4 shrink-0" />
      ) : null}
      {props.item.type === "provider-slash-command" ? (
        <span className="multi-composer-token-menu__icon ui-slash-menu__item-icon inline-flex size-4 shrink-0 items-center justify-center">
          <SlidersHorizontalIcon className="size-3.5" />
        </span>
      ) : null}
      {props.item.type === "skill" ? (
        <span className="multi-composer-token-menu__icon ui-slash-menu__item-icon inline-flex size-4 shrink-0 items-center justify-center">
          <SkillGlyph className="size-3.5" />
        </span>
      ) : null}
      <span className="multi-composer-token-menu__item-text ui-slash-menu__item-title-wrap">
        <span className="multi-composer-token-menu__primary ui-slash-menu__item-title">
          {props.item.label}
        </span>
        <span className="multi-composer-token-menu__secondary ui-slash-menu__item-description">
          {props.item.description}
        </span>
      </span>
      {tertiaryText ? (
        <span className="multi-composer-token-menu__meta ui-slash-menu__item-tertiary-text">
          {tertiaryText}
        </span>
      ) : null}
    </CommandItem>
  );
});
