import * as FS from "node:fs";
import * as Path from "node:path";
import type {
  DesktopServerExposureMode,
  DesktopTheme,
  DesktopUpdateChannel,
} from "@multi/contracts";

export interface DesktopSettings {
  readonly serverExposureMode: DesktopServerExposureMode;
  readonly themeSource: DesktopTheme;
  readonly updateChannel: DesktopUpdateChannel;
}

export const DEFAULT_DESKTOP_SETTINGS: DesktopSettings = {
  serverExposureMode: "local-only",
  themeSource: "system",
  updateChannel: "latest",
};

export function setDesktopServerExposurePreference(
  settings: DesktopSettings,
  requestedMode: DesktopServerExposureMode,
): DesktopSettings {
  return settings.serverExposureMode === requestedMode
    ? settings
    : {
        ...settings,
        serverExposureMode: requestedMode,
      };
}

export function setDesktopUpdateChannelPreference(
  settings: DesktopSettings,
  requestedChannel: DesktopUpdateChannel,
): DesktopSettings {
  return settings.updateChannel === requestedChannel
    ? settings
    : {
        ...settings,
        updateChannel: requestedChannel,
      };
}

export function setDesktopThemePreference(
  settings: DesktopSettings,
  requestedTheme: DesktopTheme,
): DesktopSettings {
  return settings.themeSource === requestedTheme
    ? settings
    : {
        ...settings,
        themeSource: requestedTheme,
      };
}

export function readDesktopSettings(settingsPath: string): DesktopSettings {
  try {
    if (!FS.existsSync(settingsPath)) {
      return DEFAULT_DESKTOP_SETTINGS;
    }

    const raw = FS.readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as {
      readonly serverExposureMode?: unknown;
      readonly themeSource?: unknown;
      readonly updateChannel?: unknown;
    };

    return {
      serverExposureMode:
        parsed.serverExposureMode === "network-accessible" ? "network-accessible" : "local-only",
      themeSource:
        parsed.themeSource === "light" || parsed.themeSource === "dark"
          ? parsed.themeSource
          : "system",
      updateChannel: parsed.updateChannel === "nightly" ? "nightly" : "latest",
    };
  } catch {
    return DEFAULT_DESKTOP_SETTINGS;
  }
}

export function writeDesktopSettings(settingsPath: string, settings: DesktopSettings): void {
  const directory = Path.dirname(settingsPath);
  const tempPath = `${settingsPath}.${process.pid}.${Date.now()}.tmp`;
  FS.mkdirSync(directory, { recursive: true });
  FS.writeFileSync(tempPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  FS.renameSync(tempPath, settingsPath);
}
