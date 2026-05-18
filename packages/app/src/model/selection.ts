import {
  DEFAULT_GIT_TEXT_GENERATION_MODEL,
  DEFAULT_GIT_TEXT_GENERATION_MODEL_BY_PROVIDER,
  defaultInstanceIdForDriver,
  type ModelSelection,
  ProviderDriverKind,
  ProviderInstanceId,
  type ProviderOptionSelection,
  type ServerProvider,
} from "@multi/contracts";
import {
  createModelSelection,
  normalizeModelSlug,
  resolveSelectableModel,
} from "@multi/shared/model";
import { UnifiedSettings } from "@multi/contracts/settings";

import { sortModelsForProviderInstance } from "./ordering";
import {
  type ProviderInstanceEntry,
  deriveProviderInstanceEntriesForSettings,
  sortProviderInstanceEntries,
} from "./provider-instances";
import {
  getDefaultServerModel,
  getProviderModels,
  resolveSelectableProvider,
} from "./provider-models";
import { getComposerProviderState } from "./provider-state";

const MAX_CUSTOM_MODEL_COUNT = 32;
export const MAX_CUSTOM_MODEL_LENGTH = 256;
const DEFAULT_TEXT_GENERATION_DRIVER_KIND = ProviderDriverKind.make("codex");

function readInstanceCustomModels(
  settings: UnifiedSettings,
  instanceId: ProviderInstanceId,
  driverKind: ProviderDriverKind,
): ReadonlyArray<string> {
  const instance = settings.providerInstances?.[instanceId];
  const config = instance?.config;
  if (config !== null && typeof config === "object") {
    const value = (config as Record<string, unknown>).customModels;
    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === "string");
    }
  }
  const defaultInstanceId = defaultInstanceIdForDriver(driverKind);
  if (instanceId !== defaultInstanceId) {
    return [];
  }
  const defaultProviderConfigs = settings.providers as Record<
    string,
    { readonly customModels: ReadonlyArray<string> } | undefined
  >;
  return defaultProviderConfigs[driverKind]?.customModels ?? [];
}

export interface AppModelOption {
  slug: string;
  name: string;
  shortName?: string;
  subProvider?: string;
  selectable?: boolean;
  isCustom: boolean;
}

export type AppModelResolverStatus =
  | { readonly kind: "ready"; readonly message: null }
  | { readonly kind: "loading"; readonly message: string }
  | {
      readonly kind: "missing-provider";
      readonly message: string;
      readonly requestedInstanceId: ProviderInstanceId;
    }
  | {
      readonly kind: "disabled-provider";
      readonly message: string;
      readonly requestedInstanceId: ProviderInstanceId;
    }
  | {
      readonly kind: "empty-catalog";
      readonly message: string;
      readonly selectedInstanceId: ProviderInstanceId;
    }
  | {
      readonly kind: "missing-model";
      readonly message: string;
      readonly requestedModel: string;
      readonly selectedInstanceId: ProviderInstanceId;
    };

export interface AppProviderModelState {
  readonly status: AppModelResolverStatus;
  readonly providerInstanceEntries: ReadonlyArray<ProviderInstanceEntry>;
  readonly modelOptionsByInstance: ReadonlyMap<ProviderInstanceId, ReadonlyArray<AppModelOption>>;
  readonly requestedInstanceId: ProviderInstanceId | null;
  readonly requestedModel: string | null;
  readonly selectedProviderEntry: ProviderInstanceEntry | undefined;
  readonly selectedProvider: ProviderDriverKind;
  readonly selectedInstanceId: ProviderInstanceId;
  readonly selectedModel: string;
  readonly selectedModelOptions: ReadonlyArray<AppModelOption>;
  readonly selectableModelOptions: ReadonlyArray<AppModelOption>;
  readonly selectedProviderModels: ProviderInstanceEntry["models"];
  readonly modelSelection: ModelSelection;
}

function toAppModelOption(model: ServerProvider["models"][number]): AppModelOption {
  const option: AppModelOption = {
    slug: model.slug,
    name: model.name,
    isCustom: model.isCustom,
  };
  if (model.shortName) option.shortName = model.shortName;
  if (model.subProvider) option.subProvider = model.subProvider;
  if (model.selectable === false) option.selectable = false;
  return option;
}

function isAppModelOptionSelectable(option: Pick<AppModelOption, "selectable">): boolean {
  return option.selectable !== false;
}

function readInstanceModelPreferences(
  settings: UnifiedSettings,
  instanceId: ProviderInstanceId,
): { readonly hiddenModels: ReadonlyArray<string>; readonly modelOrder: ReadonlyArray<string> } {
  return (
    settings.providerModelPreferences?.[instanceId] ?? {
      hiddenModels: [],
      modelOrder: [],
    }
  );
}

function applyInstanceModelPreferences(
  options: ReadonlyArray<AppModelOption>,
  preferences: {
    readonly hiddenModels: ReadonlyArray<string>;
    readonly modelOrder: ReadonlyArray<string>;
  },
): AppModelOption[] {
  const hiddenModels = new Set(preferences.hiddenModels);
  return sortModelsForProviderInstance(
    options.filter((option) => option.isCustom || !hiddenModels.has(option.slug)),
    { modelOrder: preferences.modelOrder },
  );
}

function normalizeCustomModelSlugs(
  models: Iterable<string | null | undefined>,
  builtInModelSlugs: ReadonlySet<string>,
  provider: ProviderDriverKind = ProviderDriverKind.make("codex"),
): string[] {
  const normalizedModels: string[] = [];
  const seen = new Set<string>();

  for (const candidate of models) {
    const normalized = normalizeModelSlug(candidate, provider);
    if (
      !normalized ||
      normalized.length > MAX_CUSTOM_MODEL_LENGTH ||
      builtInModelSlugs.has(normalized) ||
      seen.has(normalized)
    ) {
      continue;
    }

    seen.add(normalized);
    normalizedModels.push(normalized);
    if (normalizedModels.length >= MAX_CUSTOM_MODEL_COUNT) {
      break;
    }
  }

  return normalizedModels;
}

export function getAppModelOptions(
  settings: UnifiedSettings,
  providers: ReadonlyArray<ServerProvider>,
  provider: ProviderDriverKind,
  _selectedModel?: string | null,
): AppModelOption[] {
  const options: AppModelOption[] = getProviderModels(providers, provider).map(toAppModelOption);
  const seen = new Set(options.map((option) => option.slug));
  const builtInModelSlugs = new Set(
    getProviderModels(providers, provider)
      .filter((model) => !model.isCustom)
      .map((model) => model.slug),
  );

  const defaultInstanceId = defaultInstanceIdForDriver(provider);
  const customModels = readInstanceCustomModels(settings, defaultInstanceId, provider);
  for (const slug of normalizeCustomModelSlugs(customModels, builtInModelSlugs, provider)) {
    if (seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    options.push({
      slug,
      name: slug,
      isCustom: true,
    });
  }

  return applyInstanceModelPreferences(
    options,
    readInstanceModelPreferences(settings, defaultInstanceId),
  );
}

export function getAppModelOptionsForInstance(
  settings: UnifiedSettings,
  entry: ProviderInstanceEntry,
): AppModelOption[] {
  const options: AppModelOption[] = entry.models.map(toAppModelOption);
  const seen = new Set(options.map((option) => option.slug));
  const builtInModelSlugs = new Set(
    entry.models.filter((model) => !model.isCustom).map((model) => model.slug),
  );

  const customModels = readInstanceCustomModels(settings, entry.instanceId, entry.driverKind);
  for (const slug of normalizeCustomModelSlugs(customModels, builtInModelSlugs, entry.driverKind)) {
    if (seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    options.push({ slug, name: slug, isCustom: true });
  }

  return applyInstanceModelPreferences(
    options,
    readInstanceModelPreferences(settings, entry.instanceId),
  );
}

function buildModelOptionsByInstance(
  settings: UnifiedSettings,
  entries: ReadonlyArray<ProviderInstanceEntry>,
): ReadonlyMap<ProviderInstanceId, ReadonlyArray<AppModelOption>> {
  const out = new Map<ProviderInstanceId, ReadonlyArray<AppModelOption>>();
  for (const entry of entries) {
    out.set(entry.instanceId, getAppModelOptionsForInstance(settings, entry));
  }
  return out;
}

function selectableProviderEntry(entry: ProviderInstanceEntry): boolean {
  return entry.enabled && entry.isAvailable;
}

function getRequestedProviderStatus(input: {
  readonly entries: ReadonlyArray<ProviderInstanceEntry>;
  readonly requestedInstanceId: ProviderInstanceId | null;
  readonly selectedEntry: ProviderInstanceEntry | undefined;
}): AppModelResolverStatus {
  if (input.entries.length === 0) {
    return {
      kind: "loading",
      message: "Provider catalog is still loading.",
    };
  }

  if (!input.requestedInstanceId) {
    return { kind: "ready", message: null };
  }

  const requestedEntry = input.entries.find(
    (entry) => entry.instanceId === input.requestedInstanceId,
  );
  if (!requestedEntry) {
    return {
      kind: "missing-provider",
      requestedInstanceId: input.requestedInstanceId,
      message: "Selected provider is no longer available.",
    };
  }

  if (!selectableProviderEntry(requestedEntry)) {
    return {
      kind: "disabled-provider",
      requestedInstanceId: input.requestedInstanceId,
      message: "Selected provider is disabled.",
    };
  }

  if (!input.selectedEntry || !selectableProviderEntry(input.selectedEntry)) {
    return {
      kind: "disabled-provider",
      requestedInstanceId: input.requestedInstanceId,
      message: "Selected provider is disabled.",
    };
  }

  return { kind: "ready", message: null };
}

function getModelStatus(input: {
  readonly providerStatus: AppModelResolverStatus;
  readonly requestedModel: string | null;
  readonly selectedInstanceId: ProviderInstanceId;
  readonly selectableModelOptions: ReadonlyArray<AppModelOption>;
  readonly resolvedRequestedModel: string | null;
}): AppModelResolverStatus {
  if (input.providerStatus.kind !== "ready") {
    return input.providerStatus;
  }

  if (input.selectableModelOptions.length === 0) {
    return {
      kind: "empty-catalog",
      selectedInstanceId: input.selectedInstanceId,
      message: "Selected provider has no selectable models.",
    };
  }

  if (input.requestedModel && !input.resolvedRequestedModel) {
    return {
      kind: "missing-model",
      requestedModel: input.requestedModel,
      selectedInstanceId: input.selectedInstanceId,
      message: "Selected model is no longer available.",
    };
  }

  return input.providerStatus;
}

export function resolveAppProviderModelState(input: {
  readonly settings: UnifiedSettings;
  readonly providers: ReadonlyArray<ServerProvider>;
  readonly requestedSelection?: ModelSelection | null | undefined;
  readonly requestedInstanceId?: ProviderInstanceId | null | undefined;
  readonly requestedModel?: string | null | undefined;
  readonly requestedOptions?: ReadonlyArray<ProviderOptionSelection> | null | undefined;
}): AppProviderModelState {
  const providerInstanceEntries = sortProviderInstanceEntries(
    deriveProviderInstanceEntriesForSettings(input.settings, input.providers),
  );
  const modelOptionsByInstance = buildModelOptionsByInstance(
    input.settings,
    providerInstanceEntries,
  );
  const requestedInstanceId =
    input.requestedSelection?.instanceId ?? input.requestedInstanceId ?? null;
  const requestedModel = input.requestedSelection?.model ?? input.requestedModel ?? null;
  const requestedOptions = input.requestedSelection?.options ?? input.requestedOptions;
  const requestedEntry = requestedInstanceId
    ? providerInstanceEntries.find((entry) => entry.instanceId === requestedInstanceId)
    : undefined;
  const selectedProviderEntry =
    requestedEntry && selectableProviderEntry(requestedEntry)
      ? requestedEntry
      : (providerInstanceEntries.find(selectableProviderEntry) ??
        requestedEntry ??
        providerInstanceEntries[0]);
  const selectedProvider = selectedProviderEntry?.driverKind ?? DEFAULT_TEXT_GENERATION_DRIVER_KIND;
  const selectedInstanceId =
    selectedProviderEntry?.instanceId ?? defaultInstanceIdForDriver(selectedProvider);
  const selectedProviderModels = selectedProviderEntry?.models ?? [];
  const selectedModelOptions = modelOptionsByInstance.get(selectedInstanceId) ?? [];
  const selectableModelOptions = selectedModelOptions.filter(isAppModelOptionSelectable);
  const resolvedRequestedModel = resolveSelectableModel(
    selectedProvider,
    requestedModel,
    selectableModelOptions,
  );
  const selectedModel =
    resolvedRequestedModel ??
    selectableModelOptions[0]?.slug ??
    DEFAULT_GIT_TEXT_GENERATION_MODEL_BY_PROVIDER[selectedProvider] ??
    DEFAULT_GIT_TEXT_GENERATION_MODEL;
  const providerStatus = getRequestedProviderStatus({
    entries: providerInstanceEntries,
    requestedInstanceId,
    selectedEntry: selectedProviderEntry,
  });
  const status = getModelStatus({
    providerStatus,
    requestedModel,
    selectedInstanceId,
    selectableModelOptions,
    resolvedRequestedModel,
  });
  const { modelOptionsForDispatch } = getComposerProviderState({
    provider: selectedProvider,
    model: selectedModel,
    models: selectedProviderModels,
    prompt: "",
    modelOptions: requestedOptions,
  });

  return {
    status,
    providerInstanceEntries,
    modelOptionsByInstance,
    requestedInstanceId,
    requestedModel,
    selectedProviderEntry,
    selectedProvider,
    selectedInstanceId,
    selectedModel,
    selectedModelOptions,
    selectableModelOptions,
    selectedProviderModels,
    modelSelection: createModelSelection(
      selectedInstanceId,
      selectedModel,
      modelOptionsForDispatch,
    ),
  };
}

export function resolveAppModelSelection(
  provider: ProviderDriverKind,
  settings: UnifiedSettings,
  providers: ReadonlyArray<ServerProvider>,
  selectedModel: string | null | undefined,
): string {
  const resolvedProvider = resolveSelectableProvider(providers, provider);
  const options = getAppModelOptions(settings, providers, resolvedProvider, selectedModel);
  const selectableOptions = options.filter(isAppModelOptionSelectable);
  return (
    resolveSelectableModel(resolvedProvider, selectedModel, selectableOptions) ??
    getDefaultServerModel(providers, resolvedProvider)
  );
}

export function resolveAppModelSelectionForInstance(
  instanceId: ProviderInstanceId,
  settings: UnifiedSettings,
  providers: ReadonlyArray<ServerProvider>,
  selectedModel: string | null | undefined,
): string | null {
  const state = resolveAppProviderModelState({
    settings,
    providers,
    requestedInstanceId: instanceId,
    requestedModel: selectedModel,
  });
  if (
    state.status.kind === "loading" ||
    state.status.kind === "missing-provider" ||
    state.status.kind === "disabled-provider" ||
    state.status.kind === "empty-catalog" ||
    state.selectedProviderEntry?.instanceId !== instanceId
  ) {
    return null;
  }
  return state.selectedModel;
}
