import { afterEach, describe, expect, it, vi } from "vitest";

const originalWindow = globalThis.window;

afterEach(() => {
  vi.resetModules();

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
    return;
  }

  globalThis.window = originalWindow;
});

describe("branding", () => {
  it("uses injected desktop branding when available", async () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        desktopBridge: {
          getAppBranding: () => ({
            baseName: "Multi",
            stageLabel: "Alpha",
            displayName: "Multi (Alpha)",
          }),
        },
      },
    });

    const branding = await import("./branding");

    expect(branding.APP_BASE_NAME).toBe("Multi");
    expect(branding.APP_STAGE_LABEL).toBe("Alpha");
    expect(branding.APP_DISPLAY_NAME).toBe("Multi (Alpha)");
  });
});
