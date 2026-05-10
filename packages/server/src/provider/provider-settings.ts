import {
  ClaudeSettings,
  CodexSettings,
  CursorSettings,
  DEFAULT_SERVER_SETTINGS,
  OpenCodeSettings,
  ProviderDriverKind,
  type ProviderInstanceConfig,
  type ProviderInstanceId,
  type ServerSettings,
  defaultInstanceIdForDriver,
} from "@multi/contracts";
import { Schema } from "effect";

const CODEX_PROVIDER = ProviderDriverKind.make("codex");
const CLAUDE_AGENT_PROVIDER = ProviderDriverKind.make("claudeAgent");
const CURSOR_PROVIDER = ProviderDriverKind.make("cursor");
const OPENCODE_PROVIDER = ProviderDriverKind.make("opencode");

export const CANONICAL_PROVIDER_DRIVER_ORDER = [
  CODEX_PROVIDER,
  CLAUDE_AGENT_PROVIDER,
  CURSOR_PROVIDER,
  OPENCODE_PROVIDER,
] as const satisfies ReadonlyArray<ProviderDriverKind>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveProviderInstanceConfig(input: {
  readonly settings: ServerSettings;
  readonly driver: ProviderDriverKind;
  readonly instanceId: ProviderInstanceId;
}): ProviderInstanceConfig | undefined {
  const instance = input.settings.providerInstances[input.instanceId];
  if (instance?.driver !== input.driver) {
    return undefined;
  }
  return instance;
}

function resolveSettingsRecord(input: {
  readonly fallback: unknown;
  readonly instance: ProviderInstanceConfig | undefined;
}): Record<string, unknown> {
  const fallback = isRecord(input.fallback) ? input.fallback : {};
  if (!input.instance) {
    return { ...fallback };
  }

  return {
    ...fallback,
    ...(isRecord(input.instance.config) ? input.instance.config : {}),
    enabled: input.instance.enabled ?? true,
  };
}

function isDefaultProviderInstance(
  driver: ProviderDriverKind,
  instanceId: ProviderInstanceId,
): boolean {
  return instanceId === defaultInstanceIdForDriver(driver);
}

function fallbackCodexSettings(settings: ServerSettings, instanceId: ProviderInstanceId) {
  return isDefaultProviderInstance(CODEX_PROVIDER, instanceId)
    ? settings.providers.codex
    : DEFAULT_SERVER_SETTINGS.providers.codex;
}

function fallbackClaudeSettings(settings: ServerSettings, instanceId: ProviderInstanceId) {
  return isDefaultProviderInstance(CLAUDE_AGENT_PROVIDER, instanceId)
    ? settings.providers.claudeAgent
    : DEFAULT_SERVER_SETTINGS.providers.claudeAgent;
}

function fallbackCursorSettings(settings: ServerSettings, instanceId: ProviderInstanceId) {
  return isDefaultProviderInstance(CURSOR_PROVIDER, instanceId)
    ? settings.providers.cursor
    : DEFAULT_SERVER_SETTINGS.providers.cursor;
}

function fallbackOpenCodeSettings(settings: ServerSettings, instanceId: ProviderInstanceId) {
  return isDefaultProviderInstance(OPENCODE_PROVIDER, instanceId)
    ? settings.providers.opencode
    : DEFAULT_SERVER_SETTINGS.providers.opencode;
}

export function resolveCodexSettings(
  settings: ServerSettings,
  instanceId: ProviderInstanceId = defaultInstanceIdForDriver(CODEX_PROVIDER),
): typeof CodexSettings.Type {
  return Schema.decodeUnknownSync(CodexSettings)(
    resolveSettingsRecord({
      fallback: fallbackCodexSettings(settings, instanceId),
      instance: resolveProviderInstanceConfig({
        settings,
        driver: CODEX_PROVIDER,
        instanceId,
      }),
    }),
  );
}

export function resolveClaudeSettings(
  settings: ServerSettings,
  instanceId: ProviderInstanceId = defaultInstanceIdForDriver(CLAUDE_AGENT_PROVIDER),
): typeof ClaudeSettings.Type {
  return Schema.decodeUnknownSync(ClaudeSettings)(
    resolveSettingsRecord({
      fallback: fallbackClaudeSettings(settings, instanceId),
      instance: resolveProviderInstanceConfig({
        settings,
        driver: CLAUDE_AGENT_PROVIDER,
        instanceId,
      }),
    }),
  );
}

export function resolveCursorSettings(
  settings: ServerSettings,
  instanceId: ProviderInstanceId = defaultInstanceIdForDriver(CURSOR_PROVIDER),
): typeof CursorSettings.Type {
  return Schema.decodeUnknownSync(CursorSettings)(
    resolveSettingsRecord({
      fallback: fallbackCursorSettings(settings, instanceId),
      instance: resolveProviderInstanceConfig({
        settings,
        driver: CURSOR_PROVIDER,
        instanceId,
      }),
    }),
  );
}

export function resolveOpenCodeSettings(
  settings: ServerSettings,
  instanceId: ProviderInstanceId = defaultInstanceIdForDriver(OPENCODE_PROVIDER),
): typeof OpenCodeSettings.Type {
  return Schema.decodeUnknownSync(OpenCodeSettings)(
    resolveSettingsRecord({
      fallback: fallbackOpenCodeSettings(settings, instanceId),
      instance: resolveProviderInstanceConfig({
        settings,
        driver: OPENCODE_PROVIDER,
        instanceId,
      }),
    }),
  );
}

export function resolveProviderEnabled(input: {
  readonly settings: ServerSettings;
  readonly driver: ProviderDriverKind;
  readonly instanceId?: ProviderInstanceId | undefined;
}): boolean {
  const instanceId = input.instanceId ?? defaultInstanceIdForDriver(input.driver);
  switch (input.driver) {
    case CODEX_PROVIDER:
      return resolveCodexSettings(input.settings, instanceId).enabled;
    case CLAUDE_AGENT_PROVIDER:
      return resolveClaudeSettings(input.settings, instanceId).enabled;
    case CURSOR_PROVIDER:
      return resolveCursorSettings(input.settings, instanceId).enabled;
    case OPENCODE_PROVIDER:
      return resolveOpenCodeSettings(input.settings, instanceId).enabled;
    default:
      return input.settings.providerInstances[instanceId]?.enabled ?? true;
  }
}
