import { registerCustomCSSVariableTheme } from "@pierre/diffs";

const WORKBENCH_DIFF_THEME_NAME = "multi-workbench";

export const DIFF_THEME_NAMES = {
  light: WORKBENCH_DIFF_THEME_NAME,
  dark: WORKBENCH_DIFF_THEME_NAME,
} as const;

export type DiffThemeName = (typeof DIFF_THEME_NAMES)[keyof typeof DIFF_THEME_NAMES];

const DIFF_THEME_REGISTRATION_KEY = "__multiWorkbenchDiffThemeRegistered";

type DiffThemeRegistrationGlobal = typeof globalThis & {
  [DIFF_THEME_REGISTRATION_KEY]?: true;
};

const WORKBENCH_DIFF_THEME_DEFAULTS = {
  foreground: "var(--foreground)",
  background:
    "var(--glass-editor-surface-background, var(--multi-workbench-editor-surface-background))",
  "token-link": "var(--multi-action, var(--primary))",
  "token-string": "var(--multi-diff-syntax-string, oklch(0.615 0.17 147.948))",
  "token-comment": "var(--multi-diff-syntax-comment, oklch(0.615 0.009 286.134))",
  "token-constant": "var(--multi-diff-syntax-constant, oklch(0.66 0.118 223.572))",
  "token-keyword": "var(--multi-diff-syntax-keyword, oklch(0.65 0.239 7.957))",
  "token-parameter": "var(--multi-diff-syntax-parameter, oklch(0.659 0.146 55.201))",
  "token-function": "var(--multi-diff-syntax-function, oklch(0.56 0.249 290.006))",
  "token-string-expression": "var(--multi-diff-syntax-string, oklch(0.615 0.17 147.948))",
  "token-punctuation": "var(--multi-fg-secondary)",
  "token-inserted": "var(--multi-diff-addition)",
  "token-deleted": "var(--multi-diff-deletion)",
  "token-changed": "var(--multi-diff-syntax-changed, oklch(0.754 0.151 89.445))",
  "ansi-black": "var(--multi-diff-syntax-ansi-black, oklch(0.232 0.002 286.063))",
  "ansi-red": "var(--multi-diff-deletion)",
  "ansi-green": "var(--multi-diff-syntax-ansi-green, oklch(0.615 0.17 147.948))",
  "ansi-yellow": "var(--multi-diff-syntax-changed, oklch(0.754 0.151 89.445))",
  "ansi-blue": "var(--multi-action, var(--primary))",
  "ansi-magenta": "var(--multi-diff-syntax-type, oklch(0.621 0.26 319.948))",
  "ansi-cyan": "var(--multi-diff-syntax-constant, oklch(0.66 0.118 223.572))",
  "ansi-white": "var(--foreground)",
  "ansi-bright-black": "var(--multi-diff-syntax-comment, oklch(0.615 0.009 286.134))",
  "ansi-bright-red": "var(--multi-diff-deletion)",
  "ansi-bright-green": "var(--multi-diff-syntax-ansi-green, oklch(0.615 0.17 147.948))",
  "ansi-bright-yellow": "var(--multi-diff-syntax-changed, oklch(0.754 0.151 89.445))",
  "ansi-bright-blue": "var(--multi-action, var(--primary))",
  "ansi-bright-magenta": "var(--multi-diff-syntax-type, oklch(0.621 0.26 319.948))",
  "ansi-bright-cyan": "var(--multi-diff-syntax-constant, oklch(0.66 0.118 223.572))",
  "ansi-bright-white": "var(--foreground)",
} satisfies Record<string, string>;

function registerWorkbenchDiffTheme() {
  const registrationGlobal = globalThis as DiffThemeRegistrationGlobal;
  if (registrationGlobal[DIFF_THEME_REGISTRATION_KEY] === true) {
    return;
  }

  registerCustomCSSVariableTheme(WORKBENCH_DIFF_THEME_NAME, WORKBENCH_DIFF_THEME_DEFAULTS, false);
  registrationGlobal[DIFF_THEME_REGISTRATION_KEY] = true;
}

registerWorkbenchDiffTheme();

export function resolveDiffThemeName(theme: "light" | "dark"): DiffThemeName {
  return theme === "dark" ? DIFF_THEME_NAMES.dark : DIFF_THEME_NAMES.light;
}

const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;
const SECONDARY_HASH_SEED = 0x9e3779b9;
const SECONDARY_HASH_MULTIPLIER = 0x85ebca6b;

export function fnv1a32(
  input: string,
  seed = FNV_OFFSET_BASIS_32,
  multiplier = FNV_PRIME_32,
): number {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, multiplier) >>> 0;
  }
  return hash >>> 0;
}

export function buildPatchCacheKey(patch: string, scope = "diff-panel"): string {
  const normalizedPatch = patch.trim();
  const primary = fnv1a32(normalizedPatch, FNV_OFFSET_BASIS_32, FNV_PRIME_32).toString(36);
  const secondary = fnv1a32(
    normalizedPatch,
    SECONDARY_HASH_SEED,
    SECONDARY_HASH_MULTIPLIER,
  ).toString(36);
  return `${scope}:${normalizedPatch.length}:${primary}:${secondary}`;
}
