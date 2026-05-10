import type { ProviderInstanceConfig, ProviderInstanceId, ServerSettings } from "@multi/contracts";
import type { UnifiedSettings } from "@multi/contracts/settings";

export function buildProviderInstanceUpdatePatch(input: {
  readonly settings: Pick<ServerSettings, "providerInstances">;
  readonly instanceId: ProviderInstanceId;
  readonly instance: ProviderInstanceConfig;
  readonly textGenerationModelSelection?:
    | ServerSettings["textGenerationModelSelection"]
    | undefined;
}): Partial<UnifiedSettings> {
  return {
    providerInstances: {
      ...input.settings.providerInstances,
      [input.instanceId]: input.instance,
    },
    ...(input.textGenerationModelSelection !== undefined
      ? { textGenerationModelSelection: input.textGenerationModelSelection }
      : {}),
  };
}
