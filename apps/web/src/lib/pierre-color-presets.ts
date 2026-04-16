/** Semantic shell maps derived from @pierre/theme VS Code themes (sideBar, editor, list, git). */
/* Intentionally omit --background, --card, --popover: avoid full-bleed page/top-bar tint; shell header stays transparent. */

export const PIERRE_DARK_VARS: Record<string, string> = {
  "--foreground": "#fbfbfb",
  "--primary": "#009fff",
  "--primary-foreground": "#070707",
  "--secondary": "color-mix(in srgb, #fbfbfb 8%, #070707)",
  "--secondary-foreground": "#fbfbfb",
  "--muted": "color-mix(in srgb, #fbfbfb 6%, #070707)",
  "--muted-foreground": "#84848a",
  "--accent": "#19283c73",
  "--accent-foreground": "#fbfbfb",
  "--destructive": "#ff2e3f",
  "--border": "#1f1f21",
  "--input": "#1f1f21",
  "--ring": "oklch(0.68 0.14 245 / 45%)",
  "--chrome-color-sidebar":
    "color-mix(in srgb, #141415 var(--chrome-sidebar-opacity), transparent)",
  "--chrome-color-chat": "color-mix(in srgb, #0a0a0a var(--chrome-chat-opacity), transparent)",
  "--chrome-color-editor": "color-mix(in srgb, #070707 var(--chrome-editor-opacity), transparent)",
  "--chrome-color-surface":
    "color-mix(in srgb, #0c0c0c var(--chrome-surface-opacity), transparent)",
  "--chrome-color-elevated":
    "color-mix(in srgb, #141415 var(--chrome-elevated-opacity), transparent)",
  "--chrome-color-bubble": "color-mix(in srgb, #141415 var(--chrome-bubble-opacity), transparent)",
  "--chrome-color-bubble-opaque": "#141415",
  "--chrome-color-menubar":
    "color-mix(in srgb, #070707 var(--chrome-menubar-opacity), transparent)",
  "--chrome-color-border": "color-mix(in srgb, #fbfbfb 10%, transparent)",
  "--chrome-color-stroke": "color-mix(in srgb, #fbfbfb 8%, transparent)",
  "--chrome-color-stroke-tertiary": "color-mix(in srgb, #fbfbfb 6%, transparent)",
  "--chrome-color-stroke-strong": "color-mix(in srgb, #fbfbfb 14%, transparent)",
  "--chrome-color-hover": "#19283c59",
  "--chrome-color-active": "#19283c99",
  "--chrome-diff-addition": "#00cab1",
  "--chrome-diff-deletion": "#ff2e3f",
  "--chrome-diff-addition-bg": "color-mix(in srgb, #00cab1 18%, transparent)",
  "--chrome-diff-deletion-bg": "color-mix(in srgb, #ff2e3f 18%, transparent)",
};

export const PIERRE_LIGHT_VARS: Record<string, string> = {
  "--foreground": "#070707",
  "--primary": "#009fff",
  "--primary-foreground": "#ffffff",
  "--secondary": "color-mix(in srgb, #070707 4%, #ffffff)",
  "--secondary-foreground": "#070707",
  "--muted": "color-mix(in srgb, #070707 4%, #ffffff)",
  "--muted-foreground": "#6c6c71",
  "--accent": "#dfebff73",
  "--accent-foreground": "#070707",
  "--destructive": "#ff2e3f",
  "--border": "#eeeeef",
  "--input": "#dbdbdd",
  "--ring": "oklch(0.68 0.14 245 / 38%)",
  "--chrome-color-sidebar":
    "color-mix(in srgb, #f8f8f8 var(--chrome-sidebar-opacity), transparent)",
  "--chrome-color-chat": "color-mix(in srgb, #fafafa var(--chrome-chat-opacity), transparent)",
  "--chrome-color-editor": "color-mix(in srgb, #ffffff var(--chrome-editor-opacity), transparent)",
  "--chrome-color-surface":
    "color-mix(in srgb, #f5f5f6 var(--chrome-surface-opacity), transparent)",
  "--chrome-color-elevated":
    "color-mix(in srgb, #eeeeef var(--chrome-elevated-opacity), transparent)",
  "--chrome-color-bubble": "color-mix(in srgb, #eeeeef var(--chrome-bubble-opacity), transparent)",
  "--chrome-color-bubble-opaque": "#eeeeef",
  "--chrome-color-menubar":
    "color-mix(in srgb, #ffffff var(--chrome-menubar-opacity), transparent)",
  "--chrome-color-border": "color-mix(in srgb, #070707 10%, transparent)",
  "--chrome-color-stroke": "color-mix(in srgb, #070707 8%, transparent)",
  "--chrome-color-stroke-tertiary": "color-mix(in srgb, #070707 6%, transparent)",
  "--chrome-color-stroke-strong": "color-mix(in srgb, #070707 12%, transparent)",
  "--chrome-color-hover": "#dfebff59",
  "--chrome-color-active": "#dfebffcc",
  "--chrome-diff-addition": "#00cab1",
  "--chrome-diff-deletion": "#ff2e3f",
  "--chrome-diff-addition-bg": "color-mix(in srgb, #00cab1 15%, transparent)",
  "--chrome-diff-deletion-bg": "color-mix(in srgb, #ff2e3f 15%, transparent)",
};

export const ALL_PRESET_VAR_KEYS = [
  ...new Set([...Object.keys(PIERRE_DARK_VARS), ...Object.keys(PIERRE_LIGHT_VARS)]),
];
