import { create } from "zustand";

interface CommandPaletteOpenIntent {
  kind: "add-project" | "project";
  requestId: number;
}

interface CommandPaletteController {
  readonly openAddProject: () => void;
}

interface CommandPaletteStore {
  open: boolean;
  openIntent: CommandPaletteOpenIntent | null;
  openSessionId: number;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  openAddProject: () => void;
  openProject: () => void;
  registerController: (controller: CommandPaletteController) => () => void;
  controller: CommandPaletteController | null;
}

function nextRequestId(state: CommandPaletteStore): number {
  return (state.openIntent?.requestId ?? 0) + 1;
}

export const useCommandPaletteStore = create<CommandPaletteStore>((set, get) => ({
  open: false,
  openSessionId: 0,
  openIntent: null,
  controller: null,
  setOpen: (open) =>
    set((state) => ({
      open,
      ...(open && !state.open ? { openSessionId: state.openSessionId + 1 } : {}),
      ...(open ? {} : { openIntent: null }),
    })),
  toggleOpen: () =>
    set((state) => ({
      open: !state.open,
      ...(!state.open ? { openSessionId: state.openSessionId + 1 } : {}),
      ...(state.open ? { openIntent: null } : {}),
    })),
  openAddProject: () => {
    const controller = get().controller;
    if (controller) {
      set((state) => ({
        open: true,
        ...(state.open ? {} : { openSessionId: state.openSessionId + 1 }),
        openIntent: null,
      }));
      controller.openAddProject();
      return;
    }
    set((state) => ({
      open: true,
      openSessionId: state.openSessionId + 1,
      openIntent: {
        kind: "add-project",
        requestId: nextRequestId(state),
      },
    }));
  },
  openProject: () =>
    set((state) => ({
      open: true,
      openSessionId: state.openSessionId + 1,
      openIntent: {
        kind: "project",
        requestId: nextRequestId(state),
      },
    })),
  registerController: (controller) => {
    set({ controller });

    const pendingIntent = get().openIntent;
    if (pendingIntent?.kind === "add-project") {
      set({ openIntent: null });
      controller.openAddProject();
    }

    return () => {
      set((state) => (state.controller === controller ? { controller: null } : {}));
    };
  },
}));
