import {
  type ProviderInstanceId,
  type ProviderDriverKind,
  type ResolvedKeybindingsConfig,
} from "@multi/contracts";
import { resolveSelectableModel } from "@multi/shared/model";
import { memo, useMemo, useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { IconMagnifyingGlass } from "central-icons";
import { ModelListRow } from "./model-list-row";
import { isModelPickerNewModel } from "./model-picker-model-highlights";
import { buildModelPickerSearchText, scoreModelPickerSearch } from "./model-picker-search";
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxList } from "@multi/ui/combobox";
import { ModelEsque, PROVIDER_ICON_BY_PROVIDER } from "./provider-icon-utils";
import {
  modelPickerJumpCommandForIndex,
  modelPickerJumpIndexFromCommand,
  resolveShortcutCommand,
  shortcutLabelForCommand,
} from "../../keybindings";
import { useSettings } from "~/hooks/use-settings";
import type { ProviderInstanceEntry } from "../../provider-instances";
import { providerModelKey, sortProviderModelItems } from "../../model-ordering";

type ModelPickerItem = {
  slug: string;
  name: string;
  shortName?: string;
  subProvider?: string;
  instanceId: ProviderInstanceId;
  driverKind: ProviderDriverKind;
  instanceDisplayName: string;
  instanceAccentColor?: string | undefined;
  continuationGroupKey?: string | undefined;
};

const EMPTY_MODEL_JUMP_LABELS = new Map<string, string>();

// Split a `${instanceId}:${slug}` combobox key back into its pieces. Slugs
// can contain colons (e.g. some vendor model ids), so we only split on the
// first colon — anything after that is the slug.
function splitInstanceModelKey(key: string): { instanceId: ProviderInstanceId; slug: string } {
  const colonIndex = key.indexOf(":");
  if (colonIndex === -1) {
    return { instanceId: key as ProviderInstanceId, slug: "" };
  }
  return {
    instanceId: key.slice(0, colonIndex) as ProviderInstanceId,
    slug: key.slice(colonIndex + 1),
  };
}

export const ModelPickerContent = memo(function ModelPickerContent(props: {
  /** The instance currently selected in the composer (combobox "value"). */
  activeInstanceId: ProviderInstanceId;
  model: string;
  /**
   * When set, the picker is locked to the given driver kind — typically
   * because the user is editing a previously-sent message and can't change
   * which driver served the turn. Multiple instances of the same kind
   * remain selectable (e.g. locked to `codex` still lets the user switch
   * between the default Codex and a custom Codex Personal).
   */
  lockedProvider: ProviderDriverKind | null;
  lockedContinuationGroupKey?: string | null;
  /**
   * All configured provider instances in display order. Used to resolve
   * display names and sort model rows by the active composer instance first.
   */
  instanceEntries: ReadonlyArray<ProviderInstanceEntry>;
  keybindings?: ResolvedKeybindingsConfig;
  /**
   * Model options per instance. Keyed by `ProviderInstanceId` so the
   * default Codex instance and any custom Codex instances each have their
   * own list (custom instances typically start with the same built-in
   * model set but are free to diverge via customModels).
   */
  modelOptionsByInstance: ReadonlyMap<ProviderInstanceId, ReadonlyArray<ModelEsque>>;
  terminalOpen: boolean;
  /** When the host popover opens, mirror this for search seeding (e.g. `/model` query). */
  popoverOpen: boolean;
  /**
   * Applied when `popoverOpen` transitions from closed to open. `undefined` leaves the
   * previous search query; a string (including `""`) replaces it.
   */
  openSearchSeed?: string | undefined;
  onRequestClose?: () => void;
  onInstanceModelChange: (instanceId: ProviderInstanceId, model: string) => void;
}) {
  const {
    keybindings: providedKeybindings,
    modelOptionsByInstance,
    instanceEntries,
    onInstanceModelChange,
  } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRegionRef = useRef<HTMLDivElement>(null);
  const highlightedModelKeyRef = useRef<string | null>(null);
  const favorites = useSettings((s) => s.favorites ?? []);
  const keybindings = useMemo<ResolvedKeybindingsConfig>(
    () => providedKeybindings ?? [],
    [providedKeybindings],
  );

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  const popoverWasOpenRef = useRef(false);
  useLayoutEffect(() => {
    const open = props.popoverOpen;
    if (!open) {
      popoverWasOpenRef.current = false;
      return;
    }
    const justOpened = !popoverWasOpenRef.current;
    popoverWasOpenRef.current = true;
    if (justOpened && props.openSearchSeed !== undefined) {
      setSearchQuery(props.openSearchSeed);
    }
    if (justOpened) {
      focusSearchInput();
      const frame = window.requestAnimationFrame(() => {
        focusSearchInput();
      });
      const timeout = window.setTimeout(() => {
        focusSearchInput();
      }, 0);
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timeout);
      };
    }
    return undefined;
  }, [focusSearchInput, props.openSearchSeed, props.popoverOpen]);

  // Create a Set for efficient lookup. Favorites are keyed by
  // `${instanceId}:${slug}`; the storage schema widened from ProviderDriverKind
  // to ProviderInstanceId so pre-migration favorites keyed by driver slugs
  // (e.g. `"codex:gpt-5"`) still resolve — the default instance id equals
  // the driver slug.
  const favoritesSet = useMemo(() => {
    return new Set(favorites.map((fav) => providerModelKey(fav.provider, fav.model)));
  }, [favorites]);

  /**
   * Lookup table keyed by `instanceId`. Used for display name + driver
   * kind enrichment and for `ready`/enabled filtering before flattening
   * models into the search list.
   */
  const entryByInstanceId = useMemo(
    () => new Map(instanceEntries.map((entry) => [entry.instanceId, entry])),
    [instanceEntries],
  );
  const matchesLockedProvider = useCallback(
    (entry: Pick<ProviderInstanceEntry, "driverKind" | "continuationGroupKey">): boolean => {
      if (props.lockedProvider === null) return true;
      if (entry.driverKind !== props.lockedProvider) return false;
      if (!props.lockedContinuationGroupKey) return true;
      return entry.continuationGroupKey === props.lockedContinuationGroupKey;
    },
    [props.lockedContinuationGroupKey, props.lockedProvider],
  );

  const readyInstanceSet = useMemo(() => {
    const ready = new Set<ProviderInstanceId>();
    for (const entry of instanceEntries) {
      if (entry.status === "ready") {
        ready.add(entry.instanceId);
      }
    }
    return ready;
  }, [instanceEntries]);

  // Flatten models into a searchable array. One pass over the
  // instance-keyed map; each model carries its instance id + driver kind
  // so the list row can render the right icon and display name without
  // another lookup.
  const flatModels = useMemo(() => {
    const out: ModelPickerItem[] = [];
    for (const [instanceId, models] of modelOptionsByInstance) {
      const entry = entryByInstanceId.get(instanceId);
      if (!entry) {
        // Instance disappeared between renders (configuration change). Skip
        // its models — stale options shouldn't appear in the picker.
        continue;
      }
      if (!readyInstanceSet.has(instanceId)) {
        continue;
      }
      for (const model of models) {
        out.push({
          slug: model.slug,
          name: model.name,
          ...(model.shortName ? { shortName: model.shortName } : {}),
          ...(model.subProvider ? { subProvider: model.subProvider } : {}),
          instanceId,
          driverKind: entry.driverKind,
          instanceDisplayName: entry.displayName,
          ...(entry.accentColor ? { instanceAccentColor: entry.accentColor } : {}),
          ...(entry.continuationGroupKey
            ? { continuationGroupKey: entry.continuationGroupKey }
            : {}),
        });
      }
    }
    return out;
  }, [modelOptionsByInstance, entryByInstanceId, readyInstanceSet]);

  const isLocked = props.lockedProvider !== null;
  const instanceOrder = useMemo(
    () => [
      props.activeInstanceId,
      ...instanceEntries
        .map((entry) => entry.instanceId)
        .filter((instanceId) => instanceId !== props.activeInstanceId),
    ],
    [instanceEntries, props.activeInstanceId],
  );

  // Filter models based on search query and selected instance
  const filteredModels = useMemo(() => {
    let result = flatModels;

    // Apply tokenized fuzzy search across the combined provider/model search fields.
    if (searchQuery.trim()) {
      const rankedMatches = result
        .map((model) => ({
          model,
          score: scoreModelPickerSearch(
            {
              name: model.name,
              ...(model.shortName ? { shortName: model.shortName } : {}),
              ...(model.subProvider ? { subProvider: model.subProvider } : {}),
              driverKind: model.driverKind,
              providerDisplayName: model.instanceDisplayName,
              isFavorite: favoritesSet.has(providerModelKey(model.instanceId, model.slug)),
            },
            searchQuery,
          ),
          isFavorite: favoritesSet.has(providerModelKey(model.instanceId, model.slug)),
          tieBreaker: buildModelPickerSearchText({
            name: model.name,
            ...(model.shortName ? { shortName: model.shortName } : {}),
            ...(model.subProvider ? { subProvider: model.subProvider } : {}),
            driverKind: model.driverKind,
            providerDisplayName: model.instanceDisplayName,
          }),
        }))
        .filter(
          (
            rankedModel,
          ): rankedModel is {
            model: ModelPickerItem;
            score: number;
            isFavorite: boolean;
            tieBreaker: string;
          } => rankedModel.score !== null,
        );

      // When searching, we only respect locked provider (by driver kind),
      // ignoring sidebar selection so account-scoped searches can find a
      // model before the user chooses a specific instance rail item.
      if (props.lockedProvider !== null) {
        return rankedMatches
          .filter((rankedModel) => matchesLockedProvider(rankedModel.model))
          .toSorted((a, b) => {
            const scoreDelta = a.score - b.score;
            if (scoreDelta !== 0) {
              return scoreDelta;
            }
            if (a.isFavorite !== b.isFavorite) {
              return a.isFavorite ? -1 : 1;
            }
            return a.tieBreaker.localeCompare(b.tieBreaker);
          })
          .map((rankedModel) => rankedModel.model);
      }

      return rankedMatches
        .toSorted((a, b) => {
          const scoreDelta = a.score - b.score;
          if (scoreDelta !== 0) {
            return scoreDelta;
          }
          if (a.isFavorite !== b.isFavorite) {
            return a.isFavorite ? -1 : 1;
          }
          return a.tieBreaker.localeCompare(b.tieBreaker);
        })
        .map((rankedModel) => rankedModel.model);
    }

    if (props.lockedProvider !== null) {
      result = result.filter((m) => matchesLockedProvider(m));
    }

    return sortProviderModelItems(result, {
      favoriteModelKeys: favoritesSet,
      groupFavorites: true,
      instanceOrder,
    });
  }, [
    favoritesSet,
    flatModels,
    instanceOrder,
    matchesLockedProvider,
    props.lockedProvider,
    searchQuery,
  ]);

  const handleModelSelect = useCallback(
    (modelSlug: string, instanceId: ProviderInstanceId) => {
      const options = modelOptionsByInstance.get(instanceId);
      if (!options) {
        return;
      }
      const entry = entryByInstanceId.get(instanceId);
      if (!entry) {
        return;
      }
      // `resolveSelectableModel` uses the driver kind for normalization
      // (slug casing etc.). Custom instances share their driver's
      // normalization rules, so pass the driver kind here.
      const resolvedModel = resolveSelectableModel(entry.driverKind, modelSlug, options);
      if (resolvedModel) {
        onInstanceModelChange(instanceId, resolvedModel);
      }
    },
    [entryByInstanceId, modelOptionsByInstance, onInstanceModelChange],
  );

  const LockedProviderIcon =
    isLocked && props.lockedProvider ? PROVIDER_ICON_BY_PROVIDER[props.lockedProvider] : null;
  // Header label for locked mode. Use the active instance's displayName
  // when the lock narrows to exactly one instance (so "Codex Personal"
  // shows instead of the generic driver label); fall back to the first
  // matching entry otherwise.
  const lockedHeaderLabel = useMemo(() => {
    if (!isLocked || !props.lockedProvider) return null;
    const matches = instanceEntries.filter((entry) => matchesLockedProvider(entry));
    if (matches.length === 0) return null;
    const active = matches.find((entry) => entry.instanceId === props.activeInstanceId);
    return (active ?? matches[0])?.displayName ?? null;
  }, [
    isLocked,
    matchesLockedProvider,
    props.lockedProvider,
    props.activeInstanceId,
    instanceEntries,
  ]);
  const modelJumpCommandByKey = useMemo(() => {
    const mapping = new Map<
      string,
      NonNullable<ReturnType<typeof modelPickerJumpCommandForIndex>>
    >();
    for (const [visibleModelIndex, model] of filteredModels.entries()) {
      const jumpCommand = modelPickerJumpCommandForIndex(visibleModelIndex);
      if (!jumpCommand) {
        return mapping;
      }
      mapping.set(`${model.instanceId}:${model.slug}`, jumpCommand);
    }
    return mapping;
  }, [filteredModels]);
  const modelJumpModelKeys = useMemo(
    () => [...modelJumpCommandByKey.keys()],
    [modelJumpCommandByKey],
  );
  const allModelKeys = useMemo(
    (): string[] => flatModels.map((model) => `${model.instanceId}:${model.slug}`),
    [flatModels],
  );
  const filteredModelKeys = useMemo(
    (): string[] => filteredModels.map((model) => `${model.instanceId}:${model.slug}`),
    [filteredModels],
  );
  const filteredModelByKey = useMemo(
    (): ReadonlyMap<string, ModelPickerItem> =>
      new Map(filteredModels.map((model) => [`${model.instanceId}:${model.slug}`, model] as const)),
    [filteredModels],
  );
  const modelJumpShortcutContext = useMemo(
    () =>
      ({
        terminalFocus: false,
        terminalOpen: props.terminalOpen,
        modelPickerOpen: true,
      }) as const,
    [props.terminalOpen],
  );
  const modelJumpLabelByKey = useMemo((): ReadonlyMap<string, string> => {
    if (modelJumpCommandByKey.size === 0) {
      return EMPTY_MODEL_JUMP_LABELS;
    }
    const shortcutLabelOptions = {
      platform: navigator.platform,
      context: modelJumpShortcutContext,
    };
    const mapping = new Map<string, string>();
    for (const [modelKey, command] of modelJumpCommandByKey) {
      const label = shortcutLabelForCommand(keybindings, command, shortcutLabelOptions);
      if (label) {
        mapping.set(modelKey, label);
      }
    }
    return mapping.size > 0 ? mapping : EMPTY_MODEL_JUMP_LABELS;
  }, [keybindings, modelJumpCommandByKey, modelJumpShortcutContext]);

  useEffect(() => {
    const onWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      const command = resolveShortcutCommand(event, keybindings, {
        platform: navigator.platform,
        context: modelJumpShortcutContext,
      });
      const jumpIndex = modelPickerJumpIndexFromCommand(command ?? "");
      if (jumpIndex === null) {
        return;
      }

      const targetModelKey = modelJumpModelKeys[jumpIndex];
      if (!targetModelKey) {
        return;
      }
      const { instanceId, slug } = splitInstanceModelKey(targetModelKey);
      event.preventDefault();
      event.stopPropagation();
      handleModelSelect(slug, instanceId);
    };

    window.addEventListener("keydown", onWindowKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onWindowKeyDown, true);
    };
  }, [handleModelSelect, keybindings, modelJumpModelKeys, modelJumpShortcutContext]);

  useLayoutEffect(() => {
    const listRegion = listRegionRef.current;
    if (!listRegion) {
      return;
    }

    let cancelled = false;
    let frame = 0;
    let nestedFrame = 0;
    let timeout = 0;

    const measureScrollArea = () => {
      if (cancelled) {
        return;
      }
      const viewport = listRegion.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
      if (!viewport || viewport.scrollHeight <= viewport.clientHeight) {
        return;
      }
      const originalScrollTop = viewport.scrollTop;
      const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
      if (maxScrollTop <= 0) {
        return;
      }
      viewport.scrollTop = Math.min(originalScrollTop + 1, maxScrollTop);
      viewport.scrollTop = originalScrollTop;
    };

    queueMicrotask(measureScrollArea);
    frame = window.requestAnimationFrame(() => {
      measureScrollArea();
      nestedFrame = window.requestAnimationFrame(measureScrollArea);
    });
    timeout = window.setTimeout(measureScrollArea, 0);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(nestedFrame);
      window.clearTimeout(timeout);
    };
  }, [filteredModelKeys]);

  return (
    <div className="relative flex max-h-[250px] min-h-0 w-[213px] min-w-[183px] flex-col overflow-hidden rounded-[var(--cursor-radius-lg,8px)] border border-[var(--cursor-stroke-tertiary,var(--multi-stroke-secondary))] bg-[var(--cursor-bg-elevated,var(--multi-bg-elevated))] font-multi text-[12px]/[16px] text-[var(--cursor-text-primary,var(--multi-fg-primary))] shadow-[var(--cursor-box-shadow-sm,var(--multi-shadow-popup))] backdrop-blur-[18px]">
      {/* Locked provider header (only shown in locked mode) */}
      {isLocked && LockedProviderIcon && lockedHeaderLabel && (
        <div className="flex min-h-8 items-center gap-1.5 border-b border-[var(--cursor-stroke-tertiary,var(--multi-stroke-tertiary))] px-2">
          <LockedProviderIcon className="size-3.5 shrink-0 text-[var(--cursor-text-secondary,var(--multi-fg-secondary))]" />
          <span className="truncate text-[12px]/[16px] font-medium">{lockedHeaderLabel}</span>
        </div>
      )}

      {/* Main content area */}
      <Combobox
        inline
        items={allModelKeys}
        filteredItems={filteredModelKeys}
        filter={null}
        autoHighlight
        open
        value={`${props.activeInstanceId}:${props.model}`}
        onItemHighlighted={(modelKey) => {
          highlightedModelKeyRef.current = typeof modelKey === "string" ? modelKey : null;
        }}
        onValueChange={(modelKey) => {
          if (typeof modelKey !== "string") {
            return;
          }
          const { instanceId, slug } = splitInstanceModelKey(modelKey);
          handleModelSelect(slug, instanceId);
        }}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Search bar */}
          <div className="bg-[var(--cursor-bg-elevated,var(--multi-bg-elevated))] px-1.5 pt-1.5 pb-1">
            <ComboboxInput
              ref={searchInputRef}
              className="[&_input]:font-sans"
              inputClassName="h-7 rounded-[6px] border-0 bg-[var(--cursor-bg-editor,var(--multi-bg-primary))] px-2 text-[12px]/[16px] shadow-none ring-0 placeholder:text-[var(--cursor-text-tertiary,var(--multi-fg-tertiary))] focus-visible:ring-0"
              placeholder="Search models"
              showTrigger={false}
              startAddon={
                <IconMagnifyingGlass className="size-3.5 shrink-0 text-[var(--cursor-text-tertiary,var(--multi-fg-tertiary))]" />
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onRequestClose?.();
                  return;
                }
                if (e.key === "Enter" && highlightedModelKeyRef.current) {
                  (e as typeof e & { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
                  e.preventDefault();
                  e.stopPropagation();
                  const { instanceId, slug } = splitInstanceModelKey(
                    highlightedModelKeyRef.current,
                  );
                  handleModelSelect(slug, instanceId);
                  return;
                }
                e.stopPropagation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              size="sm"
            />
          </div>

          {/* Model list */}
          <div ref={listRegionRef} className="relative min-h-0 flex-1">
            <ComboboxList className="size-full px-1 pb-1" data-model-picker-list="true">
              {filteredModelKeys.map((modelKey, index) => {
                const model = filteredModelByKey.get(modelKey);
                if (!model) {
                  return null;
                }
                return (
                  <ModelListRow
                    key={modelKey}
                    index={index}
                    model={model}
                    instanceId={model.instanceId}
                    driverKind={model.driverKind}
                    providerDisplayName={model.instanceDisplayName}
                    providerAccentColor={model.instanceAccentColor}
                    isSelected={
                      model.instanceId === props.activeInstanceId && model.slug === props.model
                    }
                    showProvider
                    preferShortName={!isLocked}
                    useTriggerLabel={isLocked}
                    showNewBadge={isModelPickerNewModel(model.driverKind, model.slug)}
                    jumpLabel={modelJumpLabelByKey.get(modelKey) ?? null}
                  />
                );
              })}
            </ComboboxList>
          </div>
          <ComboboxEmpty className="not-empty:py-5 empty:h-0 text-xs/4 font-normal text-[var(--cursor-text-tertiary,var(--multi-fg-tertiary))]">
            No models found
          </ComboboxEmpty>
        </div>
      </Combobox>
    </div>
  );
});
