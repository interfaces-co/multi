import { useLayoutEffect, type DependencyList, type EffectCallback } from "react";

export function useLayoutSyncEffect(effect: EffectCallback, deps: DependencyList): void {
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(effect, deps);
}
