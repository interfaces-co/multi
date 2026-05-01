import pierreDark from "@pierre/theme/pierre-dark";
import pierreLight from "@pierre/theme/pierre-light";
import type { TreeThemeInput, TreeThemeStyles } from "@pierre/trees";
import { themeToTreeStyles } from "@pierre/trees";

function toTreeThemeInput(theme: typeof pierreDark): TreeThemeInput {
  const colors = theme.colors as Record<string, string>;
  const bg = colors["editor.background"] ?? (theme.type === "dark" ? "#1e1e1e" : "#ffffff");
  const fg = colors["editor.foreground"] ?? (theme.type === "dark" ? "#d4d4d4" : "#1e1e1e");
  return {
    type: theme.type,
    bg,
    fg,
    colors,
  };
}

/**
 * Pierre theme JSON → Trees `--trees-theme-*` host styles (aligned with pierre-light/dark Shiki).
 */
export function getPierreTreeThemeStyles(resolvedTheme: "light" | "dark"): TreeThemeStyles {
  const raw = resolvedTheme === "dark" ? pierreDark : pierreLight;
  return themeToTreeStyles(toTreeThemeInput(raw));
}
