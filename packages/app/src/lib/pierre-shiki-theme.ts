import pierreDark from "@pierre/theme/pierre-dark";
import pierreLight from "@pierre/theme/pierre-light";
import type { TreeThemeInput, TreeThemeStyles } from "@pierre/trees";
import { themeToTreeStyles } from "@pierre/trees";

type PierreTheme = typeof pierreDark;

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

function getThemeColor(theme: PierreTheme, ...keys: string[]): string | undefined {
  const colors = theme.colors as Record<string, string>;
  for (const key of keys) {
    const value = colors[key];
    if (value) return value;
  }
  return undefined;
}

function getExtendedGitTreeStyles(theme: PierreTheme): TreeThemeStyles {
  const styles: TreeThemeStyles = {};
  const untracked = getThemeColor(
    theme,
    "gitDecoration.untrackedResourceForeground",
    "gitDecoration.addedResourceForeground",
    "terminal.ansiGreen",
  );
  const ignored = getThemeColor(
    theme,
    "gitDecoration.ignoredResourceForeground",
    "terminal.ansiBrightBlack",
  );
  const renamed = getThemeColor(
    theme,
    "gitDecoration.renamedResourceForeground",
    "terminal.ansiYellow",
  );

  if (untracked) styles["--trees-theme-git-untracked-fg"] = untracked;
  if (ignored) styles["--trees-theme-git-ignored-fg"] = ignored;
  if (renamed) styles["--trees-theme-git-renamed-fg"] = renamed;

  return styles;
}

/**
 * Pierre theme JSON → Trees `--trees-theme-*` host styles (aligned with pierre-light/dark Shiki).
 */
export function getPierreTreeThemeStyles(resolvedTheme: "light" | "dark"): TreeThemeStyles {
  const raw = resolvedTheme === "dark" ? pierreDark : pierreLight;
  return {
    ...themeToTreeStyles(toTreeThemeInput(raw)),
    ...getExtendedGitTreeStyles(raw),
  };
}
