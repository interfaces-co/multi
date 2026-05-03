"use client";

import type { CSSProperties } from "react";
import { useMemo, useSyncExternalStore } from "react";

import type { TreeThemeStyles } from "@pierre/trees";

import { getColorPalette, subscribeAppearanceSettings } from "~/lib/appearance-settings";
import { getPierreTreeThemeStyles } from "~/lib/pierre-shiki-theme";

export type TreeHostStyle = CSSProperties & Record<`--${string}`, string | number>;

/** Layout / typography overrides for every palette. Avoid git color overrides so Pierre presets can supply `--trees-theme-*`. */
const TREE_HOST_LAYOUT: TreeHostStyle = {
  "--trees-font-family-override": "var(--multi-font-ui)",
  "--trees-font-size-override": "12px",
  "--trees-font-weight-regular-override": 400,
  "--trees-font-weight-semibold-override": 500,
  "--trees-bg-override": "transparent",
  "--trees-border-color-override": "transparent",
  "--trees-border-radius-override": "4px",
  "--trees-focus-ring-width-override": "1px",
  "--trees-focus-ring-offset-override": "-1px",
  "--trees-item-margin-x-override": "8px",
  "--trees-item-padding-x-override": "4px",
  "--trees-level-gap-override": "12px",
  "--trees-gap-override": "4px",
  "--trees-icon-width-override": "14px",
};

const TREE_HOST_MULTI_GIT: TreeHostStyle = {
  "--trees-git-modified-color-override": "var(--multi-hue-blue)",
  "--trees-git-added-color-override": "var(--multi-hue-green)",
  "--trees-git-deleted-color-override": "var(--multi-hue-red)",
  "--trees-git-untracked-color-override": "var(--multi-hue-orange)",
  "--trees-git-renamed-color-override": "var(--multi-hue-purple)",
};

export const TREE_UNSAFE_CSS = `
  button[data-type='item'] {
    letter-spacing: 0;
  }

  [data-type='search-input'] {
    height: 24px;
    line-height: 16px;
  }
`;

function mergeTreeThemeStyles(
  pierre: TreeThemeStyles,
  resolvedTheme: "light" | "dark",
): TreeHostStyle {
  return {
    ...(pierre as TreeHostStyle),
    ...TREE_HOST_LAYOUT,
    colorScheme: resolvedTheme === "dark" ? "dark" : "light",
    backgroundColor: "transparent",
    borderColor: "transparent",
    color: "inherit",
  };
}

export function useWorkbenchTreeHostStyle(resolvedTheme: "light" | "dark"): TreeHostStyle {
  const colorPalette = useSyncExternalStore(
    subscribeAppearanceSettings,
    getColorPalette,
    () => "multi" as const,
  );

  const pierreTheme = useMemo(
    () => mergeTreeThemeStyles(getPierreTreeThemeStyles(resolvedTheme), resolvedTheme),
    [resolvedTheme],
  );

  return useMemo<TreeHostStyle>(() => {
    if (colorPalette === "pierre") {
      return pierreTheme;
    }
    return {
      ...TREE_HOST_LAYOUT,
      ...TREE_HOST_MULTI_GIT,
      colorScheme: resolvedTheme === "dark" ? "dark" : "light",
    };
  }, [colorPalette, pierreTheme, resolvedTheme]);
}
