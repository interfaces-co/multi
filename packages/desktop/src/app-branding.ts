import type { DesktopAppBranding, DesktopAppStageLabel } from "@multi/contracts";

const APP_BASE_NAME = "Multi";

export function resolveDesktopAppStageLabel(input: {
  readonly isDevelopment: boolean;
}): DesktopAppStageLabel {
  if (input.isDevelopment) {
    return "Dev";
  }

  return "Alpha";
}

export function resolveDesktopAppBranding(input: {
  readonly isDevelopment: boolean;
}): DesktopAppBranding {
  const stageLabel = resolveDesktopAppStageLabel(input);
  return {
    baseName: APP_BASE_NAME,
    stageLabel,
    displayName: `${APP_BASE_NAME} (${stageLabel})`,
  };
}
