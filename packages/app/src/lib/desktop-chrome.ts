import type { DesktopWindowChromeState } from "@multi/contracts";

import { isElectronHost } from "../env";

/** Must stay in sync with `trafficLightPosition` in packages/desktop/src/main.ts (getWindowTitleBarOptions). */
export const MACOS_TRAFFIC_LIGHTS = {
  x: 14,
  y: 14,
  spacerWidth: 80,
  paddingTop: 28,
} as const;

const TRAFFIC_LIGHT_CLUSTER_HEIGHT_PX = 16;
const TITLEBAR_CONTROL_HEIGHT_PX = 22;
export const TITLEBAR_CONTROL_OFFSET_TOP_PX =
  MACOS_TRAFFIC_LIGHTS.y - (TITLEBAR_CONTROL_HEIGHT_PX - TRAFFIC_LIGHT_CLUSTER_HEIGHT_PX) / 2;

const INSET = "--multi-electron-traffic-inset";
const TOP = "--multi-electron-traffic-padding-top";
const CONTROL_HEIGHT = "--multi-titlebar-control-height";
const ROW_TOP = "--multi-titlebar-control-row-top";
const SIDEBAR_CONTENT_TOP_OFFSET = "--multi-shell-sidebar-content-top-offset";
/** Match Cursor/VS Code `.part.titlebar` (`height: 34px` in workbench.desktop.main.css). */
const TITLEBAR_HEIGHT = "--multi-header-height";
const TITLEBAR_HEIGHT_PX = 34;
const FULLSCREEN_TRAFFIC_INSET_PX = 8;

function applyElectronChromeState(state: DesktopWindowChromeState): void {
  const root = document.documentElement;
  root.dataset.electronFullscreen = state.fullscreen ? "true" : "false";
  root.style.setProperty(
    INSET,
    `${state.fullscreen ? FULLSCREEN_TRAFFIC_INSET_PX : MACOS_TRAFFIC_LIGHTS.spacerWidth}px`,
  );
  root.style.setProperty(TOP, `${state.fullscreen ? 0 : MACOS_TRAFFIC_LIGHTS.paddingTop}px`);
  root.style.setProperty(
    SIDEBAR_CONTENT_TOP_OFFSET,
    `${state.fullscreen ? TITLEBAR_HEIGHT_PX : MACOS_TRAFFIC_LIGHTS.paddingTop}px`,
  );
  root.style.setProperty(CONTROL_HEIGHT, `${TITLEBAR_CONTROL_HEIGHT_PX}px`);
  root.style.setProperty(ROW_TOP, `${TITLEBAR_CONTROL_OFFSET_TOP_PX}px`);
  root.style.setProperty(TITLEBAR_HEIGHT, `${TITLEBAR_HEIGHT_PX}px`);
}

export function applyDesktopChromeMetrics() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!isElectronHost()) {
    root.style.removeProperty(INSET);
    root.style.removeProperty(TOP);
    root.style.removeProperty(CONTROL_HEIGHT);
    root.style.removeProperty(ROW_TOP);
    root.style.removeProperty(SIDEBAR_CONTENT_TOP_OFFSET);
    root.style.removeProperty(TITLEBAR_HEIGHT);
    delete root.dataset.electronFullscreen;
    return;
  }
  applyElectronChromeState(window.desktopBridge?.getWindowChromeState?.() ?? { fullscreen: false });
  window.desktopBridge?.onWindowChromeState?.(applyElectronChromeState);
}
