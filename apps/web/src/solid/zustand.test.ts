// @vitest-environment node
import { createRoot } from "solid-js";
import { createStore } from "zustand/vanilla";
import { describe, expect, it } from "vitest";
import { createZustandSignal } from "./zustand";

describe("createZustandSignal", () => {
  it("tracks a selected Zustand slice inside a Solid owner", () => {
    const store = createStore<{ count: number; label: string }>()(() => ({
      count: 0,
      label: "initial",
    }));

    createRoot((dispose) => {
      const count = createZustandSignal(store, (state) => state.count);

      expect(count()).toBe(0);

      store.setState({ label: "changed" });
      expect(count()).toBe(0);

      store.setState({ count: 1 });
      expect(count()).toBe(1);

      dispose();
      store.setState({ count: 2 });
      expect(count()).toBe(1);
    });
  });
});
