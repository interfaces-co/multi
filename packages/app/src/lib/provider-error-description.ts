function readRecordField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return (value as Record<string, unknown>)[key];
}

function readNonEmptyStringField(value: unknown, key: string): string | null {
  const field = readRecordField(value, key);
  return typeof field === "string" && field.trim().length > 0 ? field.trim() : null;
}

function pushDistinctDetail(lines: string[], value: string | null): void {
  if (!value || lines.some((line) => line.includes(value))) {
    return;
  }
  lines.push(value);
}

function readProviderErrorField(error: unknown, cause: unknown, key: string): string | null {
  return readNonEmptyStringField(error, key) ?? readNonEmptyStringField(cause, key);
}

export function formatProviderErrorDescription(
  error: unknown,
  fallback = "Provider action failed.",
): string {
  const cause = readRecordField(error, "cause");
  const message =
    readNonEmptyStringField(error, "message") ??
    (error instanceof Error && error.message.trim().length > 0 ? error.message.trim() : null);
  const causeMessage =
    readNonEmptyStringField(cause, "message") ??
    (cause instanceof Error && cause.message.trim().length > 0 ? cause.message.trim() : null);
  const detail = readProviderErrorField(error, cause, "detail");
  const issue = readProviderErrorField(error, cause, "issue");
  const provider = readProviderErrorField(error, cause, "provider");
  const operation = readProviderErrorField(error, cause, "operation");
  const method = readProviderErrorField(error, cause, "method");
  const settingsPath = readProviderErrorField(error, cause, "settingsPath");
  const threadId = readProviderErrorField(error, cause, "threadId");
  const lines = [message ?? fallback];

  pushDistinctDetail(lines, detail);
  pushDistinctDetail(lines, issue);
  pushDistinctDetail(lines, causeMessage);
  if (provider) {
    lines.push(`Provider: ${provider}`);
  }
  if (operation) {
    lines.push(`Operation: ${operation}`);
  }
  if (method) {
    lines.push(`Method: ${method}`);
  }
  if (settingsPath) {
    lines.push(`Settings: ${settingsPath}`);
  }
  if (threadId) {
    lines.push(`Thread: ${threadId}`);
  }

  return lines.join("\n");
}
