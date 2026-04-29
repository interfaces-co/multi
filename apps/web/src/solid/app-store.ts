import { type AppState, useStore } from "~/store";
import {
  createZustandSignal,
  type CreateZustandSignalOptions,
  type ReadableStore,
} from "./zustand";

const appStore: ReadableStore<AppState> = useStore;

export function createAppStoreSignal<TSlice>(
  selector: (state: AppState) => TSlice,
  options?: CreateZustandSignalOptions<TSlice>,
) {
  return createZustandSignal(appStore, selector, options);
}
