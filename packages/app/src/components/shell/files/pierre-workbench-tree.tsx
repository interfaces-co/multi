"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";

import type { TreeThemeStyles } from "@pierre/trees";

import { getPierreTreeThemeStyles } from "~/lib/pierre-shiki-theme";

export type TreeHostStyle = CSSProperties & Record<`--${string}`, string | number>;

/** Layout / typography overrides only. Theme colors come from Pierre Shiki tokens. */
const TREE_HOST_LAYOUT: TreeHostStyle = {
  "--trees-font-family-override": "var(--multi-font-ui)",
  "--trees-font-size-override": "12px",
  "--trees-font-weight-regular-override": 400,
  "--trees-font-weight-semibold-override": 500,
  "--trees-border-radius-override": "4px",
  "--trees-focus-ring-width-override": "1px",
  "--trees-focus-ring-offset-override": "-1px",
  "--trees-item-margin-x-override": "8px",
  "--trees-item-padding-x-override": "4px",
  "--trees-level-gap-override": "12px",
  "--trees-gap-override": "4px",
  "--trees-icon-width-override": "14px",
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
  };
}

export function useWorkbenchTreeHostStyle(resolvedTheme: "light" | "dark"): TreeHostStyle {
  return useMemo(
    () => mergeTreeThemeStyles(getPierreTreeThemeStyles(resolvedTheme), resolvedTheme),
    [resolvedTheme],
  );
}
