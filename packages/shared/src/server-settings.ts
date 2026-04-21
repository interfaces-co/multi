export interface PersistedServerObservabilitySettings {
  readonly otlpTracesUrl: string | undefined;
  readonly otlpMetricsUrl: string | undefined;
}

export function normalizePersistedServerSettingString(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function extractPersistedServerObservabilitySettings(input: {
  readonly observability?: {
    readonly otlpTracesUrl?: string;
    readonly otlpMetricsUrl?: string;
  };
}): PersistedServerObservabilitySettings {
  return {
    otlpTracesUrl: normalizePersistedServerSettingString(input.observability?.otlpTracesUrl),
    otlpMetricsUrl: normalizePersistedServerSettingString(input.observability?.otlpMetricsUrl),
  };
}

export function parsePersistedServerObservabilitySettings(
  raw: string,
): PersistedServerObservabilitySettings {
  try {
    const parsed: unknown = JSON.parse(raw);
    const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const observability =
      root.observability && typeof root.observability === "object"
        ? (root.observability as Record<string, unknown>)
        : undefined;
    const obs: { otlpTracesUrl?: string; otlpMetricsUrl?: string } = {};
    if (observability) {
      if (typeof observability.otlpTracesUrl === "string") {
        obs.otlpTracesUrl = observability.otlpTracesUrl;
      }
      if (typeof observability.otlpMetricsUrl === "string") {
        obs.otlpMetricsUrl = observability.otlpMetricsUrl;
      }
    }
    return Object.keys(obs).length > 0
      ? extractPersistedServerObservabilitySettings({ observability: obs })
      : extractPersistedServerObservabilitySettings({});
  } catch {
    return { otlpTracesUrl: undefined, otlpMetricsUrl: undefined };
  }
}
