import type {
  EnvironmentId,
  ProjectEntry,
  ProviderDriverKind,
  ServerProvider,
} from "@multi/contracts";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useMemo } from "react";

import type { ComposerTrigger } from "../../../composer-logic";
import { basenameOfPath } from "../../../vscode-icons";
import { projectSearchEntriesQueryOptions } from "~/lib/project-react-query";
import type { ComposerCommandItem, ComposerCommandMenuKind } from "./command-menu";
import { resolveComposerMenuActiveItemId } from "./menu-highlight";
import { formatProviderSkillDisplayName, searchProviderSkills } from "./provider-skills";
import { searchSlashCommandItems } from "./slash-command-search";

const COMPOSER_PATH_QUERY_DEBOUNCE_MS = 120;
const EMPTY_PROJECT_ENTRIES: ProjectEntry[] = [];

export function useComposerCommandMenu(input: {
  composerTrigger: ComposerTrigger | null;
  environmentId: EnvironmentId;
  gitCwd: string | null;
  selectedProvider: ProviderDriverKind;
  selectedProviderStatus: ServerProvider | null | undefined;
  highlightedItemId: string | null;
  highlightedSearchKey: string | null;
}) {
  const composerTriggerKind = input.composerTrigger?.kind ?? null;
  const pathTriggerQuery = input.composerTrigger?.kind === "path" ? input.composerTrigger.query : "";
  const isPathTrigger = composerTriggerKind === "path";
  const [debouncedPathQuery, composerPathQueryDebouncer] = useDebouncedValue(
    pathTriggerQuery,
    { wait: COMPOSER_PATH_QUERY_DEBOUNCE_MS },
    (debouncerState) => ({ isPending: debouncerState.isPending }),
  );
  const effectivePathQuery = pathTriggerQuery.length > 0 ? debouncedPathQuery : "";
  const projectEntriesQuery = useQuery(
    projectSearchEntriesQueryOptions({
      environmentId: input.environmentId,
      cwd: input.gitCwd,
      query: effectivePathQuery,
      enabled: isPathTrigger,
      limit: 80,
    }),
  );
  const projectEntries = projectEntriesQuery.data?.entries ?? EMPTY_PROJECT_ENTRIES;

  const composerMenuItems = useMemo<ComposerCommandItem[]>(() => {
    if (!input.composerTrigger) return [];
    if (input.composerTrigger.kind === "path") {
      return projectEntries.map((entry) => ({
        id: `path:${entry.kind}:${entry.path}`,
        type: "path",
        path: entry.path,
        pathKind: entry.kind,
        label: basenameOfPath(entry.path),
        description: entry.parentPath ?? "",
      }));
    }
    if (input.composerTrigger.kind === "slash-command") {
      const builtInSlashCommandItems = [
        {
          id: "slash:model",
          type: "slash-command",
          command: "model",
          label: "/model",
          description: "Switch response model for this thread",
        },
        {
          id: "slash:plan",
          type: "slash-command",
          command: "plan",
          label: "/plan",
          description: "Switch this thread into plan mode",
        },
        {
          id: "slash:default",
          type: "slash-command",
          command: "default",
          label: "/default",
          description: "Switch this thread back to normal build mode",
        },
      ] satisfies ReadonlyArray<Extract<ComposerCommandItem, { type: "slash-command" }>>;
      const providerSlashCommandItems = (input.selectedProviderStatus?.slashCommands ?? []).map(
        (command) => ({
          id: `provider-slash-command:${input.selectedProvider}:${command.name}`,
          type: "provider-slash-command" as const,
          provider: input.selectedProvider,
          command,
          label: `/${command.name}`,
          description: command.description ?? command.input?.hint ?? "Run provider command",
        }),
      );
      const providerSkillItems = searchProviderSkills(
        input.selectedProviderStatus?.skills ?? [],
        "",
      ).map((skill) => ({
        id: `skill:${input.selectedProvider}:${skill.name}`,
        type: "skill" as const,
        provider: input.selectedProvider,
        skill,
        label: formatProviderSkillDisplayName(skill),
        description:
          skill.shortDescription ??
          skill.description ??
          (skill.scope ? `${skill.scope} skill` : "Run provider skill"),
      }));
      const query = input.composerTrigger.query.trim().toLowerCase();
      const slashCommandItems = [
        ...providerSkillItems,
        ...providerSlashCommandItems,
        ...builtInSlashCommandItems,
      ];
      if (!query) {
        return slashCommandItems;
      }
      return searchSlashCommandItems(slashCommandItems, query);
    }
    if (input.composerTrigger.kind === "skill") {
      return searchProviderSkills(
        input.selectedProviderStatus?.skills ?? [],
        input.composerTrigger.query,
      ).map((skill) => ({
        id: `skill:${input.selectedProvider}:${skill.name}`,
        type: "skill" as const,
        provider: input.selectedProvider,
        skill,
        label: formatProviderSkillDisplayName(skill),
        description:
          skill.shortDescription ??
          skill.description ??
          (skill.scope ? `${skill.scope} skill` : "Run provider skill"),
      }));
    }
    return [];
  }, [
    input.composerTrigger,
    input.selectedProvider,
    input.selectedProviderStatus,
    projectEntries,
  ]);

  const composerMenuOpen = input.composerTrigger
    ? input.composerTrigger.kind !== "slash-model"
    : false;
  const composerMenuSearchKey = input.composerTrigger
    ? `${input.composerTrigger.kind}:${input.composerTrigger.query.trim().toLowerCase()}`
    : null;
  const activeComposerMenuItemId = useMemo(
    () =>
      resolveComposerMenuActiveItemId({
        items: composerMenuItems,
        highlightedItemId: input.highlightedItemId,
        currentSearchKey: composerMenuSearchKey,
        highlightedSearchKey: input.highlightedSearchKey,
      }),
    [
      input.highlightedItemId,
      input.highlightedSearchKey,
      composerMenuItems,
      composerMenuSearchKey,
    ],
  );
  const activeComposerMenuItem = useMemo(
    () => composerMenuItems.find((item) => item.id === activeComposerMenuItemId) ?? null,
    [activeComposerMenuItemId, composerMenuItems],
  );

  const isComposerMenuLoading =
    composerTriggerKind === "path" &&
    ((pathTriggerQuery.length > 0 && composerPathQueryDebouncer.state.isPending) ||
      projectEntriesQuery.isLoading ||
      projectEntriesQuery.isFetching);
  const composerMenuEmptyState = useMemo(() => {
    if (composerTriggerKind === "skill") {
      return "No skills found. Try / to browse provider commands.";
    }
    if (composerTriggerKind === "path") {
      return "No results found";
    }
    return "No matching command.";
  }, [composerTriggerKind]);
  const composerMenuAriaLabel: "Slash commands" | "Mentions" =
    composerTriggerKind === "slash-command" ? "Slash commands" : "Mentions";
  const composerMenuKind: ComposerCommandMenuKind =
    composerTriggerKind === "slash-command" ? "slash" : "mentions";

  return {
    composerTriggerKind,
    composerMenuItems,
    composerMenuOpen,
    composerMenuSearchKey,
    activeComposerMenuItemId,
    activeComposerMenuItem,
    isComposerMenuLoading,
    composerMenuEmptyState,
    composerMenuAriaLabel,
    composerMenuKind,
  };
}
