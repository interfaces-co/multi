import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_DESKTOP_SETTINGS,
  readDesktopSettings,
  setDesktopServerExposurePreference,
  setDesktopThemePreference,
  writeDesktopSettings,
} from "./desktop-settings";

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function makeSettingsPath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "multi-desktop-settings-test-"));
  tempDirectories.push(directory);
  return path.join(directory, "desktop-settings.json");
}

describe("desktopSettings", () => {
  it("returns defaults when no settings file exists", () => {
    expect(readDesktopSettings(makeSettingsPath())).toEqual(DEFAULT_DESKTOP_SETTINGS);
  });

  it("persists and reloads the configured server exposure mode", () => {
    const settingsPath = makeSettingsPath();

    writeDesktopSettings(settingsPath, {
      serverExposureMode: "network-accessible",
      themeSource: "system",
    });

    expect(readDesktopSettings(settingsPath)).toEqual({
      serverExposureMode: "network-accessible",
      themeSource: "system",
    });
  });

  it("preserves the requested network-accessible preference across temporary fallback", () => {
    expect(
      setDesktopServerExposurePreference(
        {
          serverExposureMode: "local-only",
          themeSource: "system",
        },
        "network-accessible",
      ),
    ).toEqual({
      serverExposureMode: "network-accessible",
      themeSource: "system",
    });
  });

  it("persists the requested desktop theme source", () => {
    expect(
      setDesktopThemePreference(
        {
          serverExposureMode: "local-only",
          themeSource: "system",
        },
        "dark",
      ),
    ).toEqual({
      serverExposureMode: "local-only",
      themeSource: "dark",
    });
  });

  it("falls back to defaults when the settings file is malformed", () => {
    const settingsPath = makeSettingsPath();
    fs.writeFileSync(settingsPath, "{not-json", "utf8");

    expect(readDesktopSettings(settingsPath)).toEqual(DEFAULT_DESKTOP_SETTINGS);
  });
});
