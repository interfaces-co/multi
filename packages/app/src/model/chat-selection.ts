import {
  ProviderDriverKind,
  ProviderInstanceId,
  type ModelSelection,
  type ProviderOptionSelection,
  type ServerProvider,
  type ServerProviderModel,
} from "@multi/contracts";
import type { UnifiedSettings } from "@multi/contracts/settings";
import { normalizeModelSlug } from "@multi/shared/model";

import {
  resolveAppProviderModelState,
  resolveAppModelSelection,
  resolveAppModelSelectionForInstance,
  type AppModelOption,
  type AppModelResolverStatus,
} from "./selection";
import {
  deriveProviderInstanceEntriesForSettings,
  resolveProviderDriverKindForInstanceSelection,
  sortProviderInstanceEntries,
  type ProviderInstanceEntry,
} from "./provider-instances";
import { getDefaultServerModel } from "./provider-models";

interface ChatModelDraft {
  readonly activeProvider: ProviderInstanceId | null;
  readonly modelSelectionByProvider: Partial<Record<ProviderInstanceId, ModelSelection>>;
}

type ProviderOptionSelectionsByInstance = Partial<
  Record<string, ReadonlyArray<ProviderOptionSelection>>
>;

interface EffectiveChatModelState {
  selectedModel: string;
  modelOptionSelectionsByInstance: ProviderOptionSelectionsByInstance | null;
}

interface ChatModelSelectionInput {
  draft: ChatModelDraft | null | undefined;
  providers: ReadonlyArray<ServerProvider>;
  settings: UnifiedSettings;
  sessionProviderInstanceId: ProviderInstanceId | null | undefined;
  threadModelSelection: ModelSelection | null | undefined;
  projectModelSelection: ModelSelection | null | undefined;
}

interface ChatModelSelectionResolution {
  providerInstanceEntries: ReadonlyArray<ProviderInstanceEntry>;
  selectedProvider: ProviderDriverKind;
  selectedInstanceId: ProviderInstanceId;
  selectedModel: string;
  selectedProviderEntry: ProviderInstanceEntry | undefined;
  selectedProviderModels: ReadonlyArray<ServerProviderModel>;
  modelOptionsByInstance: ReadonlyMap<ProviderInstanceId, ReadonlyArray<AppModelOption>>;
  modelOptionSelectionsByInstance: EffectiveChatModelState["modelOptionSelectionsByInstance"];
  modelSelection: ModelSelection;
  modelStatus: AppModelResolverStatus;
}

function providerSelectionsFromModelSelection(
  modelSelection: ModelSelection | null | undefined,
): ProviderOptionSelectionsByInstance | null {
  if (!modelSelection) {
    return null;
  }
  const options = modelSelection.options;
  if (!options || options.length === 0) {
    return null;
  }
  return { [modelSelection.instanceId]: options };
}

function modelSelectionByProviderToInstanceOptions(
  map: Partial<Record<string, ModelSelection>> | null | undefined,
): ProviderOptionSelectionsByInstance | null {
  if (!map) return null;
  const result: ProviderOptionSelectionsByInstance = {};
  for (const [provider, selection] of Object.entries(map)) {
    if (selection?.options && selection.options.length > 0) {
      result[provider] = selection.options;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function deriveEffectiveChatModelState(input: {
  draft: ChatModelDraft | null | undefined;
  providers: ReadonlyArray<ServerProvider>;
  selectedProvider: ProviderDriverKind;
  selectedInstanceId?: ProviderInstanceId | null | undefined;
  threadModelSelection: ModelSelection | null | undefined;
  defaultModelSelection: ModelSelection | null | undefined;
  projectModelSelection: ModelSelection | null | undefined;
  settings: UnifiedSettings;
}): EffectiveChatModelState {
  const baseModelCandidate =
    input.threadModelSelection?.model ??
    input.defaultModelSelection?.model ??
    input.projectModelSelection?.model ??
    null;
  const baseModel =
    (input.selectedInstanceId
      ? resolveAppModelSelectionForInstance(
          input.selectedInstanceId,
          input.settings,
          input.providers,
          baseModelCandidate,
        )
      : null) ??
    resolveAppModelSelection(
      input.selectedProvider,
      input.settings,
      input.providers,
      baseModelCandidate,
    ) ??
    normalizeModelSlug(baseModelCandidate, input.selectedProvider) ??
    getDefaultServerModel(input.providers, input.selectedProvider);
  const activeSelectionInstanceId =
    input.selectedInstanceId ?? ProviderInstanceId.make(input.selectedProvider);
  const activeSelection = input.draft?.modelSelectionByProvider?.[activeSelectionInstanceId];
  const selectedModel = activeSelection?.model
    ? (resolveAppModelSelectionForInstance(
        activeSelectionInstanceId,
        input.settings,
        input.providers,
        activeSelection.model,
      ) ??
      resolveAppModelSelection(
        input.selectedProvider,
        input.settings,
        input.providers,
        activeSelection.model,
      ))
    : baseModel;
  const modelOptionSelectionsByInstance =
    modelSelectionByProviderToInstanceOptions(input.draft?.modelSelectionByProvider) ??
    providerSelectionsFromModelSelection(input.threadModelSelection) ??
    providerSelectionsFromModelSelection(input.defaultModelSelection) ??
    providerSelectionsFromModelSelection(input.projectModelSelection) ??
    null;

  return {
    selectedModel,
    modelOptionSelectionsByInstance,
  };
}

function resolveSelectedInstanceId(input: {
  providerInstanceEntries: ReadonlyArray<ProviderInstanceEntry>;
  selectedProvider: ProviderDriverKind;
  candidateInstanceIds: ReadonlyArray<ProviderInstanceId | null | undefined>;
  explicitSelectedInstanceId: ProviderInstanceId | null | undefined;
  threadModelSelection: ModelSelection | null | undefined;
  projectModelSelection: ModelSelection | null | undefined;
}): ProviderInstanceId {
  for (const candidate of input.candidateInstanceIds) {
    if (!candidate) {
      continue;
    }
    const match = input.providerInstanceEntries.find(
      (entry) => entry.instanceId === candidate && entry.enabled,
    );
    if (match) {
      return match.instanceId;
    }
  }

  if (
    input.explicitSelectedInstanceId &&
    !input.providerInstanceEntries.some(
      (entry) => entry.instanceId === input.explicitSelectedInstanceId,
    )
  ) {
    return input.explicitSelectedInstanceId;
  }

  return (
    input.providerInstanceEntries.find(
      (entry) => entry.enabled && entry.driverKind === input.selectedProvider,
    )?.instanceId ??
    input.providerInstanceEntries.find((entry) => entry.enabled)?.instanceId ??
    input.providerInstanceEntries[0]?.instanceId ??
    input.threadModelSelection?.instanceId ??
    input.projectModelSelection?.instanceId ??
    ProviderInstanceId.make("codex")
  );
}

export function resolveChatModelSelection(
  input: ChatModelSelectionInput,
): ChatModelSelectionResolution {
  const providerInstanceEntries = sortProviderInstanceEntries(
    deriveProviderInstanceEntriesForSettings(input.settings, input.providers),
  );
  const threadProvider =
    input.sessionProviderInstanceId ??
    input.threadModelSelection?.instanceId ??
    input.settings.textGenerationModelSelection.instanceId ??
    input.projectModelSelection?.instanceId ??
    null;
  const explicitSelectedInstanceId = input.draft?.activeProvider ?? threadProvider;
  const selectedProvider =
    resolveProviderDriverKindForInstanceSelection(
      providerInstanceEntries,
      input.providers,
      explicitSelectedInstanceId,
    ) ?? ProviderDriverKind.make("codex");
  const selectedInstanceId = resolveSelectedInstanceId({
    providerInstanceEntries,
    selectedProvider,
    candidateInstanceIds: [
      input.draft?.activeProvider,
      input.sessionProviderInstanceId,
      input.threadModelSelection?.instanceId,
      input.settings.textGenerationModelSelection.instanceId,
      input.projectModelSelection?.instanceId,
    ],
    explicitSelectedInstanceId,
    threadModelSelection: input.threadModelSelection,
    projectModelSelection: input.projectModelSelection,
  });
  const effectiveModelState = deriveEffectiveChatModelState({
    draft: input.draft,
    providers: input.providers,
    selectedProvider,
    selectedInstanceId,
    threadModelSelection: input.threadModelSelection,
    defaultModelSelection: input.settings.textGenerationModelSelection,
    projectModelSelection: input.projectModelSelection,
    settings: input.settings,
  });
  const resolvedModelState = resolveAppProviderModelState({
    settings: input.settings,
    providers: input.providers,
    requestedInstanceId: selectedInstanceId,
    requestedModel: effectiveModelState.selectedModel,
    requestedOptions: effectiveModelState.modelOptionSelectionsByInstance?.[selectedInstanceId],
  });

  return {
    providerInstanceEntries: resolvedModelState.providerInstanceEntries,
    selectedProvider: resolvedModelState.selectedProvider,
    selectedInstanceId: resolvedModelState.selectedInstanceId,
    selectedModel: resolvedModelState.selectedModel,
    selectedProviderEntry: resolvedModelState.selectedProviderEntry,
    selectedProviderModels: resolvedModelState.selectedProviderModels,
    modelOptionsByInstance: resolvedModelState.modelOptionsByInstance,
    modelOptionSelectionsByInstance: effectiveModelState.modelOptionSelectionsByInstance,
    modelSelection: resolvedModelState.modelSelection,
    modelStatus: resolvedModelState.status,
  };
}
