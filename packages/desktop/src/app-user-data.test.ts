import { describe, expect, it, vi } from "vitest";

import { resolveDesktopUserDataPath } from "./app-user-data";

describe("resolveDesktopUserDataPath", () => {
  it("preserves legacy userData directories when the path already exists", () => {
    const existsSync = vi.fn((path: string) => path === "/app-data/Multi (Alpha)");

    expect(
      resolveDesktopUserDataPath({
        appDataBase: "/app-data",
        userDataDirName: "multi",
        legacyUserDataDirName: "Multi (Alpha)",
        existsSync,
      }),
    ).toBe("/app-data/Multi (Alpha)");
  });

  it("uses the clean userData directory when no legacy data exists", () => {
    expect(
      resolveDesktopUserDataPath({
        appDataBase: "/app-data",
        userDataDirName: "multi",
        legacyUserDataDirName: "Multi (Alpha)",
        existsSync: () => false,
      }),
    ).toBe("/app-data/multi");
  });
});
