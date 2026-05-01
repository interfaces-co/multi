export type ComposerPromptJson =
  | null
  | boolean
  | number
  | string
  | ComposerPromptJson[]
  | { [key: string]: ComposerPromptJson | undefined };

export type ComposerPromptDoc = {
  type: "doc";
  content?: ComposerPromptJson[];
  [key: string]: ComposerPromptJson | undefined;
};

function isPromptJson(value: unknown): value is ComposerPromptJson {
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isPromptJson);
  if (typeof value !== "object") return false;
  return Object.values(value).every((entry) => entry === undefined || isPromptJson(entry));
}

export function isComposerPromptDoc(value: unknown): value is ComposerPromptDoc {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.type === "doc" && isPromptJson(value);
}

export function parseComposerPromptDoc(value: unknown): ComposerPromptDoc | null {
  if (typeof value === "string") {
    try {
      return parseComposerPromptDoc(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return isComposerPromptDoc(value) ? value : null;
}

function sanitizePromptJsonForPersist(value: ComposerPromptJson): ComposerPromptJson {
  if (!Array.isArray(value)) {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (value.type === "terminalContextNode") {
      const attrs = value.attrs;
      if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
        const context = attrs.context;
        if (context && typeof context === "object" && !Array.isArray(context)) {
          const persistedContext = { ...context };
          delete persistedContext.text;
          return {
            ...value,
            attrs: {
              ...attrs,
              context: persistedContext,
            },
          };
        }
      }
    }
    const next: { [key: string]: ComposerPromptJson | undefined } = {};
    for (const [key, entry] of Object.entries(value)) {
      next[key] = entry === undefined ? undefined : sanitizePromptJsonForPersist(entry);
    }
    return next;
  }
  return value.map(sanitizePromptJsonForPersist);
}

export function sanitizeComposerPromptDocForPersist(value: ComposerPromptDoc): ComposerPromptDoc {
  return sanitizePromptJsonForPersist(value) as ComposerPromptDoc;
}
