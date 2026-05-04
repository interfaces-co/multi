import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const shellDir = resolve(__dirname);
const appShellSource = readFileSync(resolve(shellDir, "app.tsx"), "utf8");
const rightWorkbenchHeaderSource = readFileSync(
  resolve(shellDir, "right-workbench-header.tsx"),
  "utf8",
);
const rightWorkbenchLayoutSource = readFileSync(
  resolve(shellDir, "right-workbench-layout.tsx"),
  "utf8",
);
const shellCssSource = readFileSync(resolve(shellDir, "../../../styles/shell.css"), "utf8");
const desktopChromeSource = readFileSync(
  resolve(shellDir, "../../../lib/desktop-chrome.ts"),
  "utf8",
);

describe("AppShell CSS root contract", () => {
  it("publishes durable shell intent and geometry from AppShell", () => {
    expect(appShellSource).toContain('"--multi-shell-left-width"');
    expect(appShellSource).toContain('"--multi-shell-left-collapsed-width"');
    expect(appShellSource).toContain('"--multi-shell-left-min-width"');
    expect(appShellSource).toContain('"--multi-shell-left-max-width"');
    expect(appShellSource).toContain('"--multi-shell-right-workbench-width"');
    expect(appShellSource).toContain('"--multi-shell-right-workbench-collapsed-width"');
    expect(appShellSource).toContain('"--multi-shell-right-workbench-min-width"');
    expect(appShellSource).toContain('"--multi-shell-right-workbench-max-width"');
    expect(appShellSource).toContain('"--multi-shell-titlebar-control-size"');
    expect(appShellSource).toContain('"--multi-shell-titlebar-control-y"');
    expect(appShellSource).toContain('"--multi-shell-titlebar-gutter"');
    expect(appShellSource).toContain("data-shell-left-intent");
    expect(appShellSource).toContain("data-shell-right-intent");
    expect(appShellSource).toContain("data-shell-right-panel");
    expect(appShellSource).toContain("data-shell-platform");
    expect(appShellSource).toContain('data-shell-chrome="glass"');
  });

  it("keeps responsive effective state out of React and Zustand", () => {
    expect(appShellSource).not.toMatch(/\buseWindowSize\b/);
    expect(appShellSource).not.toMatch(/\bResizeObserver\b/);
    expect(appShellSource).not.toMatch(/\beffectiveRightOpen\b/);
    expect(appShellSource).not.toMatch(/\beffectiveLeftOpen\b/);
    expect(appShellSource).not.toMatch(/\bcontainerWidth\b/);
    expect(appShellSource).not.toMatch(/\bshouldCollapseForViewport\b/);
  });

  it("uses CSS container queries for the chosen collapse order", () => {
    expect(shellCssSource).toContain("container-type: inline-size");
    expect(shellCssSource).toContain("@container (max-width: 980px)");
    expect(shellCssSource).toContain("--multi-shell-secondary-rail-effective-width");
    expect(shellCssSource).toContain("@container (max-width: 900px)");
    expect(shellCssSource).toContain(".agent-window__workbench");
    expect(shellCssSource).toContain("--multi-shell-right-workbench-collapsed-width");
    expect(shellCssSource).toContain("@container (max-width: 620px)");
    expect(shellCssSource).toContain(".agent-window__sidebar");
    expect(shellCssSource).toContain("--multi-shell-left-collapsed-width");
  });

  it("aligns titlebar chrome and workbench spacer from the root variables", () => {
    expect(appShellSource).toContain("multi-shell-titlebar-left-controls");
    expect(appShellSource).toContain("multi-shell-titlebar-right-toggle");
    expect(appShellSource).toContain("multi-shell-titlebar-drag-region");
    expect(rightWorkbenchHeaderSource).toContain("multi-workbench-titlebar-end-space");
    expect(shellCssSource).toContain("left: var(--multi-electron-traffic-inset)");
    expect(shellCssSource).toContain("right: var(--multi-shell-titlebar-gutter)");
    expect(shellCssSource).toContain("top: var(--multi-shell-titlebar-control-y)");
    expect(shellCssSource).toContain("margin-right: var(--multi-shell-right-effective-width)");
    expect(shellCssSource).toContain("width: var(--multi-shell-right-workbench-header-end-space)");
    expect(appShellSource).not.toContain("wco:right");
  });

  it("lets Electron fullscreen chrome update traffic-light shell spacing", () => {
    expect(desktopChromeSource).toContain("--multi-shell-sidebar-content-top-offset");
    expect(desktopChromeSource).toContain("state.fullscreen ? TITLEBAR_HEIGHT_PX");
    expect(shellCssSource).toContain("--multi-shell-sidebar-content-top-offset");
    expect(shellCssSource).toContain("var(--multi-electron-traffic-padding-top)");
  });

  it("projects secondary rail width through CSS variables", () => {
    expect(rightWorkbenchLayoutSource).toContain('"--multi-shell-secondary-rail-width"');
    expect(rightWorkbenchLayoutSource).toContain('"--multi-shell-secondary-rail-collapsed-width"');
    expect(rightWorkbenchLayoutSource).toContain('"--multi-shell-secondary-rail-min-width"');
    expect(rightWorkbenchLayoutSource).toContain('"--multi-shell-secondary-rail-max-width"');
    expect(rightWorkbenchLayoutSource).toContain('data-shell-panel="secondary"');
    expect(rightWorkbenchLayoutSource).toContain("data-resizing");
    expect(shellCssSource).toContain("width: var(--multi-shell-secondary-rail-effective-width)");
  });
});
