import { describe, expect, it } from "vitest";

import { resolveDefaultBackendCwd } from "../../src/app/DesktopEnvironment";

describe("resolveDefaultBackendCwd", () => {
  it("uses the OS documents directory in development", () => {
    expect(
      resolveDefaultBackendCwd({
        documentsDirectory: "/Users/alex/Documents",
      }),
    ).toBe("/Users/alex/Documents");
  });

  it("uses the OS documents directory in packaged builds", () => {
    expect(
      resolveDefaultBackendCwd({
        documentsDirectory: "/Users/alex/Documents",
      }),
    ).toBe("/Users/alex/Documents");
  });
});
