import { Schema } from "effect";
import { TrimmedNonEmptyString } from "./base-schemas";
import { ProviderDriverKind } from "./provider-instance";

const CODEX_DRIVER_KIND = ProviderDriverKind.make("codex");
const CLAUDE_DRIVER_KIND = ProviderDriverKind.make("claudeAgent");
const CURSOR_DRIVER_KIND = ProviderDriverKind.make("cursor");
const OPENCODE_DRIVER_KIND = ProviderDriverKind.make("opencode");

export const ProviderOptionDescriptorType = Schema.Literals(["select", "boolean"]);
export type ProviderOptionDescriptorType = typeof ProviderOptionDescriptorType.Type;

export const ProviderOptionChoice = Schema.Struct({
  id: TrimmedNonEmptyString,
  label: TrimmedNonEmptyString,
  description: Schema.optional(TrimmedNonEmptyString),
  isDefault: Schema.optional(Schema.Boolean),
});
export type ProviderOptionChoice = typeof ProviderOptionChoice.Type;

const ProviderOptionDescriptorBase = {
  id: TrimmedNonEmptyString,
  label: TrimmedNonEmptyString,
  description: Schema.optional(TrimmedNonEmptyString),
} as const;

export const SelectProviderOptionDescriptor = Schema.Struct({
  ...ProviderOptionDescriptorBase,
  type: Schema.Literal("select"),
  options: Schema.Array(ProviderOptionChoice),
  currentValue: Schema.optional(TrimmedNonEmptyString),
  promptInjectedValues: Schema.optional(Schema.Array(TrimmedNonEmptyString)),
});
export type SelectProviderOptionDescriptor = typeof SelectProviderOptionDescriptor.Type;

export const BooleanProviderOptionDescriptor = Schema.Struct({
  ...ProviderOptionDescriptorBase,
  type: Schema.Literal("boolean"),
  currentValue: Schema.optional(Schema.Boolean),
});
export type BooleanProviderOptionDescriptor = typeof BooleanProviderOptionDescriptor.Type;

export const ProviderOptionDescriptor = Schema.Union([
  SelectProviderOptionDescriptor,
  BooleanProviderOptionDescriptor,
]);
export type ProviderOptionDescriptor = typeof ProviderOptionDescriptor.Type;

export const ProviderOptionSelectionValue = Schema.Union([TrimmedNonEmptyString, Schema.Boolean]);
export type ProviderOptionSelectionValue = typeof ProviderOptionSelectionValue.Type;

export const ProviderOptionSelection = Schema.Struct({
  id: TrimmedNonEmptyString,
  value: ProviderOptionSelectionValue,
});
export type ProviderOptionSelection = typeof ProviderOptionSelection.Type;

/** Schema for the `options` field of every `ModelSelection` variant. */
export const ProviderOptionSelections = Schema.Array(ProviderOptionSelection);
export type ProviderOptionSelections = typeof ProviderOptionSelections.Type;

export const ModelCapabilities = Schema.Struct({
  optionDescriptors: Schema.optional(Schema.Array(ProviderOptionDescriptor)),
});
export type ModelCapabilities = typeof ModelCapabilities.Type;

export const DEFAULT_MODEL = "gpt-5.5";
export const DEFAULT_GIT_TEXT_GENERATION_MODEL = DEFAULT_MODEL;

export const DEFAULT_MODEL_BY_PROVIDER: Partial<Record<ProviderDriverKind, string>> = {
  [CODEX_DRIVER_KIND]: DEFAULT_MODEL,
  [CLAUDE_DRIVER_KIND]: "claude-sonnet-4-6",
  [CURSOR_DRIVER_KIND]: "auto",
  [OPENCODE_DRIVER_KIND]: "openai/gpt-5",
};

/** Per-provider text generation model defaults. */
export const DEFAULT_GIT_TEXT_GENERATION_MODEL_BY_PROVIDER: Partial<
  Record<ProviderDriverKind, string>
> = {
  [CODEX_DRIVER_KIND]: DEFAULT_GIT_TEXT_GENERATION_MODEL,
  [CLAUDE_DRIVER_KIND]: "claude-haiku-4-5",
  [CURSOR_DRIVER_KIND]: "composer-2",
  [OPENCODE_DRIVER_KIND]: "openai/gpt-5",
};

export const MODEL_SLUG_ALIASES_BY_PROVIDER: Partial<
  Record<ProviderDriverKind, Record<string, string>>
> = {
  [CLAUDE_DRIVER_KIND]: {
    opus: "claude-opus-4-7",
    "opus-4.7": "claude-opus-4-7",
    "claude-opus-4.7": "claude-opus-4-7",
    "opus-4.6": "claude-opus-4-6",
    "claude-opus-4.6": "claude-opus-4-6",
    "claude-opus-4-6-20251117": "claude-opus-4-6",
    sonnet: "claude-sonnet-4-6",
    "sonnet-4.6": "claude-sonnet-4-6",
    "claude-sonnet-4.6": "claude-sonnet-4-6",
    "claude-sonnet-4-6-20251117": "claude-sonnet-4-6",
    haiku: "claude-haiku-4-5",
    "haiku-4.5": "claude-haiku-4-5",
    "claude-haiku-4.5": "claude-haiku-4-5",
    "claude-haiku-4-5-20251001": "claude-haiku-4-5",
  },
  [CURSOR_DRIVER_KIND]: {
    composer: "composer-2",
    "composer-1.5": "composer-1.5",
    "composer-1": "composer-1.5",
    "opus-4.6-thinking": "claude-opus-4-6",
    "opus-4.6": "claude-opus-4-6",
    "sonnet-4.6-thinking": "claude-sonnet-4-6",
    "sonnet-4.6": "claude-sonnet-4-6",
    "opus-4.5-thinking": "claude-opus-4-5",
    "opus-4.5": "claude-opus-4-5",
  },
  [OPENCODE_DRIVER_KIND]: {},
};

// ── Provider display names ────────────────────────────────────────────

export const PROVIDER_DISPLAY_NAMES: Partial<Record<ProviderDriverKind, string>> = {
  [CODEX_DRIVER_KIND]: "Codex",
  [CLAUDE_DRIVER_KIND]: "Claude",
  [CURSOR_DRIVER_KIND]: "Cursor",
  [OPENCODE_DRIVER_KIND]: "OpenCode",
};
