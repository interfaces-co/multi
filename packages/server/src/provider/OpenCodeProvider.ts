import type {
  ModelCapabilities,
  OpenCodeSettings,
  ServerProvider,
  ServerProviderModel,
} from "@multi/contracts";
import { ProviderDriverKind } from "@multi/contracts";
import { Cause, Data, Effect, Equal, Layer, Stream } from "effect";

import { createModelCapabilities } from "@multi/shared/model";

import { ServerConfig } from "../config.ts";
import { ServerSettingsService } from "../server-settings.ts";
import { makeManagedServerProvider } from "./make-managed-server-provider.ts";
import {
  buildServerProvider,
  nonEmptyTrimmed,
  parseGenericCliVersion,
  providerModelsFromSettings,
} from "./provider-snapshot.ts";
import { compareCliVersions } from "./cliVersion.ts";
import { OpenCodeProvider } from "./OpenCodeProvider.service.ts";
import {
  makeOpenCodeProcessEnv,
  OpenCodeRuntime,
  openCodeRuntimeErrorDetail,
  type OpenCodeInventory,
} from "./opencodeRuntime.ts";
import type { Agent, ProviderListResponse } from "@opencode-ai/sdk/v2";
import { resolveOpenCodeSettings, type ResolvedOpenCodeSettings } from "./provider-settings.ts";

const PROVIDER = ProviderDriverKind.make("opencode");
const OPENCODE_ZEN_PROVIDER_IDS = new Set(["opencode", "opencode-go"]);
const OPENCODE_PRESENTATION = {
  displayName: "OpenCode",
  showInteractionModeToggle: false,
} as const;
const MINIMUM_OPENCODE_VERSION = "1.14.19";

class OpenCodeProbeError extends Data.TaggedError("OpenCodeProbeError")<{
  readonly cause: unknown;
  readonly detail: string;
}> {}

function normalizeProbeMessage(message: string): string | undefined {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (
    trimmed === "An error occurred in Effect.tryPromise" ||
    trimmed === "An error occurred in Effect.try"
  ) {
    return undefined;
  }
  return trimmed;
}

function normalizedErrorMessage(cause: unknown): string | undefined {
  if (cause instanceof OpenCodeProbeError) {
    return normalizeProbeMessage(cause.detail);
  }

  if (!(cause instanceof Error)) {
    return undefined;
  }

  return normalizeProbeMessage(cause.message);
}

function formatOpenCodeProbeError(input: {
  readonly cause: unknown;
  readonly isExternalServer: boolean;
  readonly serverUrl: string;
}): { readonly installed: boolean; readonly message: string } {
  const detail = normalizedErrorMessage(input.cause);
  const lower = detail?.toLowerCase() ?? "";

  if (input.isExternalServer) {
    if (
      lower.includes("401") ||
      lower.includes("403") ||
      lower.includes("unauthorized") ||
      lower.includes("forbidden")
    ) {
      return {
        installed: true,
        message: "OpenCode server rejected authentication. Check the server URL and password.",
      };
    }

    if (
      lower.includes("econnrefused") ||
      lower.includes("enotfound") ||
      lower.includes("fetch failed") ||
      lower.includes("networkerror") ||
      lower.includes("timed out") ||
      lower.includes("timeout") ||
      lower.includes("socket hang up")
    ) {
      return {
        installed: true,
        message: `Couldn't reach the configured OpenCode server at ${input.serverUrl}. Check that the server is running and the URL is correct.`,
      };
    }

    return {
      installed: true,
      message: detail ?? "Failed to connect to the configured OpenCode server.",
    };
  }

  if (lower.includes("enoent") || lower.includes("notfound")) {
    return {
      installed: false,
      message: "OpenCode CLI (`opencode`) is not installed or not on PATH.",
    };
  }

  if (lower.includes("quarantine")) {
    return {
      installed: true,
      message:
        "macOS is blocking the OpenCode binary (quarantine). Run `xattr -d com.apple.quarantine $(which opencode)` to fix this.",
    };
  }

  if (lower.includes("invalid code signature") || lower.includes("corrupted")) {
    return {
      installed: true,
      message:
        "macOS killed the OpenCode process due to an invalid code signature. The binary may be corrupted — try reinstalling OpenCode.",
    };
  }

  return {
    installed: true,
    message: detail
      ? `Failed to execute OpenCode CLI health check: ${detail}`
      : "Failed to execute OpenCode CLI health check.",
  };
}

function titleCaseSlug(value: string): string {
  return value
    .split(/[-_/]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function inferDefaultVariant(
  providerID: string,
  variants: ReadonlyArray<string>,
): string | undefined {
  if (variants.length === 1) {
    return variants[0];
  }
  if (providerID === "anthropic" || providerID.startsWith("google")) {
    return variants.includes("high") ? "high" : undefined;
  }
  if (providerID === "openai" || OPENCODE_ZEN_PROVIDER_IDS.has(providerID)) {
    return variants.includes("medium") ? "medium" : variants.includes("high") ? "high" : undefined;
  }
  return undefined;
}

function inferDefaultAgent(agents: ReadonlyArray<Agent>): string | undefined {
  return agents.find((agent) => agent.name === "build")?.name ?? agents[0]?.name ?? undefined;
}

const DEFAULT_OPENCODE_MODEL_CAPABILITIES: ModelCapabilities = createModelCapabilities({
  optionDescriptors: [],
});

function openCodeCapabilitiesForModel(input: {
  readonly providerID: string;
  readonly model: ProviderListResponse["all"][number]["models"][string];
  readonly agents: ReadonlyArray<Agent>;
}): ModelCapabilities {
  const variantValues = Object.keys(input.model.variants ?? {});
  const defaultVariant = inferDefaultVariant(input.providerID, variantValues);
  const variantOptions = variantValues.map((value) =>
    defaultVariant === value
      ? { id: value, label: titleCaseSlug(value), isDefault: true as const }
      : { id: value, label: titleCaseSlug(value) },
  );
  const primaryAgents = input.agents.filter(
    (agent) => !agent.hidden && (agent.mode === "primary" || agent.mode === "all"),
  );
  const defaultAgent = inferDefaultAgent(primaryAgents);
  const agentOptions = primaryAgents.map((agent) =>
    defaultAgent === agent.name
      ? { id: agent.name, label: titleCaseSlug(agent.name), isDefault: true as const }
      : { id: agent.name, label: titleCaseSlug(agent.name) },
  );
  return createModelCapabilities({
    optionDescriptors: [
      ...(variantOptions.length > 0
        ? [
            {
              id: "variant",
              label: "Variant",
              type: "select" as const,
              options: variantOptions,
              ...(defaultVariant ? { currentValue: defaultVariant } : {}),
            },
          ]
        : []),
      ...(agentOptions.length > 0
        ? [
            {
              id: "agent",
              label: "Agent",
              type: "select" as const,
              options: agentOptions,
              ...(defaultAgent ? { currentValue: defaultAgent } : {}),
            },
          ]
        : []),
    ],
  });
}

type OpenCodeUpstreamProvider = ProviderListResponse["all"][number];
type OpenCodeProbeStatus = Exclude<ServerProvider["status"], "disabled">;

function connectedOpenCodeProviders(
  providerList: ProviderListResponse,
): ReadonlyArray<OpenCodeUpstreamProvider> {
  const connected = new Set(providerList.connected);
  return providerList.all.filter((provider) => connected.has(provider.id));
}

function isPublicOpenCodeZenProvider(provider: OpenCodeUpstreamProvider): boolean {
  return (
    OPENCODE_ZEN_PROVIDER_IDS.has(provider.id) &&
    provider.source === "custom" &&
    provider.key === undefined &&
    provider.options.apiKey === "public"
  );
}

function formatOpenCodeProviderConnection(provider: OpenCodeUpstreamProvider): string {
  const modelCount = Object.keys(provider.models).length;
  const publicLabel = isPublicOpenCodeZenProvider(provider) ? " public" : "";
  return `${provider.name} (${modelCount}${publicLabel} model${modelCount === 1 ? "" : "s"})`;
}

function summarizeOpenCodeInventory(input: {
  readonly providerList: ProviderListResponse;
  readonly isExternalServer: boolean;
  readonly hasOpenCodeApiKey: boolean;
}): {
  readonly connectedCount: number;
  readonly authStatus: ServerProvider["auth"]["status"];
  readonly status: OpenCodeProbeStatus;
  readonly message: string;
} {
  const connectedProviders = connectedOpenCodeProviders(input.providerList);
  const connectedCount = input.providerList.connected.length;
  if (connectedCount === 0) {
    return {
      connectedCount,
      authStatus: "unknown",
      status: "warning",
      message: input.isExternalServer
        ? "Connected to the configured OpenCode server, but it did not report any connected upstream providers."
        : "OpenCode is available, but it did not report any connected upstream providers.",
    };
  }

  const hasAuthenticatedUpstream = connectedProviders.some(
    (provider) => !isPublicOpenCodeZenProvider(provider),
  );
  const connectionTarget = input.isExternalServer ? "the configured OpenCode server" : "OpenCode";
  const providerSummary =
    connectedProviders.length > 0
      ? connectedProviders.map(formatOpenCodeProviderConnection).join(", ")
      : `${connectedCount} upstream provider${connectedCount === 1 ? "" : "s"}`;
  const publicOnly =
    connectedProviders.length > 0 &&
    connectedProviders.every((provider) => isPublicOpenCodeZenProvider(provider));

  return {
    connectedCount,
    authStatus: publicOnly ? "unknown" : hasAuthenticatedUpstream ? "authenticated" : "unknown",
    status: publicOnly ? "warning" : "ready",
    message: publicOnly
      ? input.isExternalServer
        ? `${providerSummary} reported by ${connectionTarget}. The server is using OpenCode Zen public fallback, so paid Zen and Go models are unavailable. Configure OPENCODE_API_KEY for that OpenCode server, then refresh providers.`
        : input.hasOpenCodeApiKey
          ? `${providerSummary} reported by ${connectionTarget}. Multi found OPENCODE_API_KEY, but OpenCode still reported its public fallback. Restart OpenCode provider status and check OpenCode logs if this persists.`
          : `${providerSummary} reported by ${connectionTarget}. Multi did not find OPENCODE_API_KEY in its desktop login-shell environment or this provider instance, so paid Zen and Go models are unavailable. Add OPENCODE_API_KEY to your shell profile or this provider instance, restart Multi, then refresh providers.`
      : `${providerSummary} connected through ${connectionTarget}.`,
  };
}

function flattenOpenCodeModels(input: OpenCodeInventory): ReadonlyArray<ServerProviderModel> {
  const connected = new Set(input.providerList.connected);
  const models: Array<ServerProviderModel> = [];

  for (const provider of input.providerList.all) {
    if (!connected.has(provider.id)) {
      continue;
    }

    for (const model of Object.values(provider.models)) {
      const name = nonEmptyTrimmed(model.name);
      if (!name) {
        continue;
      }

      const subProvider = nonEmptyTrimmed(provider.name);
      models.push({
        slug: `${provider.id}/${model.id}`,
        name,
        ...(subProvider ? { subProvider } : {}),
        isCustom: false,
        capabilities: openCodeCapabilitiesForModel({
          providerID: provider.id,
          model,
          agents: input.agents,
        }),
      });
    }
  }

  return models.toSorted((left, right) => left.name.localeCompare(right.name));
}

const makePendingOpenCodeProvider = (openCodeSettings: OpenCodeSettings): ServerProvider => {
  const checkedAt = new Date().toISOString();
  const models = providerModelsFromSettings(
    [],
    PROVIDER,
    openCodeSettings.customModels,
    DEFAULT_OPENCODE_MODEL_CAPABILITIES,
  );

  if (!openCodeSettings.enabled) {
    return buildServerProvider({
      driver: PROVIDER,
      presentation: OPENCODE_PRESENTATION,
      enabled: false,
      checkedAt,
      models,
      probe: {
        installed: false,
        version: null,
        status: "warning",
        auth: { status: "unknown" },
        message:
          openCodeSettings.serverUrl.trim().length > 0
            ? "OpenCode is disabled in Multi settings. A server URL is configured."
            : "OpenCode is disabled in Multi settings.",
      },
    });
  }

  return buildServerProvider({
    driver: PROVIDER,
    presentation: OPENCODE_PRESENTATION,
    enabled: true,
    checkedAt,
    models,
    probe: {
      installed: false,
      version: null,
      status: "warning",
      auth: { status: "unknown" },
      message: "OpenCode provider status has not been checked in this session yet.",
    },
  });
};

export const OpenCodeProviderLive = Layer.effect(
  OpenCodeProvider,
  Effect.gen(function* () {
    const serverSettings = yield* ServerSettingsService;
    const serverConfig = yield* ServerConfig;
    const openCodeRuntime = yield* OpenCodeRuntime;

    const checkOpenCodeProviderStatus = Effect.fn("checkOpenCodeProviderStatus")(function* (input: {
      readonly settings: ResolvedOpenCodeSettings;
      readonly cwd: string;
    }): Effect.fn.Return<ServerProvider, never> {
      const checkedAt = new Date().toISOString();
      const customModels = input.settings.customModels;
      const isExternalServer = input.settings.serverUrl.trim().length > 0;

      const fallback = (cause: unknown, version: string | null = null) => {
        const failure = formatOpenCodeProbeError({
          cause,
          isExternalServer,
          serverUrl: input.settings.serverUrl,
        });
        return buildServerProvider({
          driver: PROVIDER,
          presentation: OPENCODE_PRESENTATION,
          enabled: input.settings.enabled,
          checkedAt,
          models: providerModelsFromSettings(
            [],
            PROVIDER,
            customModels,
            DEFAULT_OPENCODE_MODEL_CAPABILITIES,
          ),
          probe: {
            installed: failure.installed,
            version,
            status: "error",
            auth: { status: "unknown" },
            message: failure.message,
          },
        });
      };

      if (!input.settings.enabled) {
        return buildServerProvider({
          driver: PROVIDER,
          presentation: OPENCODE_PRESENTATION,
          enabled: false,
          checkedAt,
          models: providerModelsFromSettings(
            [],
            PROVIDER,
            customModels,
            DEFAULT_OPENCODE_MODEL_CAPABILITIES,
          ),
          probe: {
            installed: false,
            version: null,
            status: "warning",
            auth: { status: "unknown" },
            message: isExternalServer
              ? "OpenCode is disabled in Multi settings. A server URL is configured."
              : "OpenCode is disabled in Multi settings.",
          },
        });
      }

      let version: string | null = null;
      if (!isExternalServer) {
        const versionExit = yield* Effect.exit(
          openCodeRuntime
            .runOpenCodeCommand({
              binaryPath: input.settings.binaryPath,
              environment: input.settings.environment,
              args: ["--version"],
            })
            .pipe(
              Effect.mapError(
                (cause) =>
                  new OpenCodeProbeError({ cause, detail: openCodeRuntimeErrorDetail(cause) }),
              ),
            ),
        );
        if (versionExit._tag === "Failure") {
          return fallback(Cause.squash(versionExit.cause));
        }
        version = parseGenericCliVersion(versionExit.value.stdout) ?? null;

        if (!version) {
          return fallback(
            new Error(
              `Unable to determine OpenCode version from \`opencode --version\` output. Multi requires OpenCode v${MINIMUM_OPENCODE_VERSION} or newer.`,
            ),
            null,
          );
        }
        if (compareCliVersions(version, MINIMUM_OPENCODE_VERSION) < 0) {
          return buildServerProvider({
            driver: PROVIDER,
            presentation: OPENCODE_PRESENTATION,
            enabled: input.settings.enabled,
            checkedAt,
            models: providerModelsFromSettings(
              [],
              PROVIDER,
              customModels,
              DEFAULT_OPENCODE_MODEL_CAPABILITIES,
            ),
            probe: {
              installed: true,
              version,
              status: "error",
              auth: { status: "unknown" },
              message: `OpenCode v${version} is too old. Upgrade to v${MINIMUM_OPENCODE_VERSION} or newer.`,
            },
          });
        }
      }

      const inventoryExit = yield* Effect.exit(
        Effect.scoped(
          Effect.gen(function* () {
            const server = yield* openCodeRuntime
              .connectToOpenCodeServer({
                binaryPath: input.settings.binaryPath,
                environment: input.settings.environment,
                serverUrl: input.settings.serverUrl,
              })
              .pipe(
                Effect.mapError(
                  (cause) =>
                    new OpenCodeProbeError({ cause, detail: openCodeRuntimeErrorDetail(cause) }),
                ),
              );
            return yield* openCodeRuntime
              .loadOpenCodeInventory(
                openCodeRuntime.createOpenCodeSdkClient({
                  baseUrl: server.url,
                  directory: input.cwd,
                  ...(isExternalServer && input.settings.serverPassword
                    ? { serverPassword: input.settings.serverPassword }
                    : {}),
                }),
              )
              .pipe(
                Effect.mapError(
                  (cause) =>
                    new OpenCodeProbeError({ cause, detail: openCodeRuntimeErrorDetail(cause) }),
                ),
              );
          }),
        ),
      );
      if (inventoryExit._tag === "Failure") {
        return fallback(Cause.squash(inventoryExit.cause), version);
      }

      const models = providerModelsFromSettings(
        flattenOpenCodeModels(inventoryExit.value),
        PROVIDER,
        customModels,
        DEFAULT_OPENCODE_MODEL_CAPABILITIES,
      );
      const inventorySummary = summarizeOpenCodeInventory({
        providerList: inventoryExit.value.providerList,
        isExternalServer,
        hasOpenCodeApiKey:
          (makeOpenCodeProcessEnv(input.settings.environment).OPENCODE_API_KEY?.trim().length ??
            0) > 0,
      });
      return buildServerProvider({
        driver: PROVIDER,
        presentation: OPENCODE_PRESENTATION,
        enabled: true,
        checkedAt,
        models,
        probe: {
          installed: true,
          version,
          status: inventorySummary.status,
          auth: {
            status: inventorySummary.authStatus,
            type: "opencode",
          },
          message: inventorySummary.message,
        },
      });
    });

    const getProviderSettings = serverSettings.getSettings.pipe(
      Effect.map(resolveOpenCodeSettings),
    );

    return yield* makeManagedServerProvider<ResolvedOpenCodeSettings>({
      getSettings: getProviderSettings.pipe(Effect.orDie),
      streamSettings: serverSettings.streamChanges.pipe(
        Stream.map((settings) => resolveOpenCodeSettings(settings)),
      ),
      haveSettingsChanged: (previous, next) => !Equal.equals(previous, next),
      initialSnapshot: makePendingOpenCodeProvider,
      checkProvider: getProviderSettings.pipe(
        Effect.flatMap((settings) =>
          checkOpenCodeProviderStatus({
            settings,
            cwd: serverConfig.cwd,
          }),
        ),
      ),
    });
  }),
);
