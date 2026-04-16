import { useSyncExternalStore } from "react";

import { readAppearanceSnapshot, subscribeAppearanceSettings } from "../lib/appearance-settings";

export function useAppearanceSettings() {
  return useSyncExternalStore(
    subscribeAppearanceSettings,
    readAppearanceSnapshot,
    readAppearanceSnapshot,
  );
}
