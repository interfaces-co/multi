import { create } from "zustand";

interface CommandPaletteOpenIntent {
  kind: "add-project" | "project";
  requestId: number;
}

interface CommandPaletteStore {
  open: boolean;
  openIntent: CommandPaletteOpenIntent | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  openAddProject: () => void;
  openProject: () => void;
  clearOpenIntent: () => void;
}

function nextRequestId(state: CommandPaletteStore): number {
  return (state.openIntent?.requestId ?? 0) + 1;
}

export const useCommandPaletteStore = create<CommandPaletteStore>((set) => ({
  open: false,
  openIntent: null,
  setOpen: (open) => set({ open, ...(open ? {} : { openIntent: null }) }),
  toggleOpen: () =>
    set((state) => ({ open: !state.open, ...(state.open ? { openIntent: null } : {}) })),
  openAddProject: () =>
    set((state) => ({
      open: true,
      openIntent: {
        kind: "add-project",
        requestId: nextRequestId(state),
      },
    })),
  openProject: () =>
    set((state) => ({
      open: true,
      openIntent: {
        kind: "project",
        requestId: nextRequestId(state),
      },
    })),
  clearOpenIntent: () => set({ openIntent: null }),
}));
