import { createSignal, onCleanup, type Accessor } from "solid-js";
import type { StoreApi } from "zustand";

export type ReadableStore<TState> = Pick<StoreApi<TState>, "getState" | "subscribe">;

export interface CreateZustandSignalOptions<TSlice> {
  equals?: (previous: TSlice, next: TSlice) => boolean;
}

export function createZustandSignal<TState, TSlice>(
  store: ReadableStore<TState>,
  selector: (state: TState) => TSlice,
  options: CreateZustandSignalOptions<TSlice> = {},
): Accessor<TSlice> {
  const equals = options.equals ?? Object.is;
  let current = selector(store.getState());
  const [value, setValue] = createSignal(current, { equals });

  const unsubscribe = store.subscribe((state) => {
    const next = selector(state);
    if (equals(current, next)) {
      return;
    }

    current = next;
    setValue(() => next);
  });

  onCleanup(unsubscribe);
  return value;
}
