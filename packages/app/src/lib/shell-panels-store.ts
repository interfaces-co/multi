import { create } from "zustand";

const STORAGE_KEY = "multi.shell.panels.v2";
const SECONDARY_RAIL_STORAGE_KEY = "multi.shell.secondaryRail.v1";
const TERMINAL_SESSIONS_STORAGE_KEY = "multi.shell.terminalSessions.v1";
const DEFAULT_CWD_KEY = "default";

/** Persisted width limits for the chat/settings thread rail (`LeftAside`). */
export const SHELL_LEFT_PANEL_WIDTH_LIMITS = { min: 164, max: 560 } as const;

/** Cursor/VS Code auxiliary workbench width floor. Cursor's bundled part uses minimumWidth 300. */
export const RIGHT_WORKBENCH_WIDTH_LIMITS = { min: 300, max: 600 } as const;

export const SECONDARY_RAIL_LIMITS = { min: 160, max: 320 } as const;
const SECONDARY_RAIL_DEFAULT_WIDTH = 220;

export type WorkbenchTab = "files" | "git" | "terminal";

interface LeftPanelState {
  leftOpen: boolean;
  leftW: number;
}

interface WorkbenchPanelState {
  rightOpen: boolean;
  rightW: number;
  activeTab: WorkbenchTab;
  muted: boolean;
}

/** Per-project, per-tool secondary rail state. */
export interface SecondaryRailState {
  open: boolean;
  width: number;
}

/** Per-project terminal session tracking. */
export interface TerminalSessionEntry {
  id: string;
  label: string;
}

interface TerminalSessionsState {
  activeId: string;
  sessions: TerminalSessionEntry[];
}

interface ShellPanelsStoreState {
  leftOpen: boolean;
  leftW: number;
  byCwd: Record<string, WorkbenchPanelState>;
  railByCwdAndTab: Record<string, SecondaryRailState>;
  terminalByCwd: Record<string, TerminalSessionsState>;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (cwd: string | null, open: boolean) => void;
  setLeftWidth: (width: number) => void;
  setRightWidth: (cwd: string | null, width: number) => void;
  setActiveTab: (cwd: string | null, tab: WorkbenchTab) => void;
  setMuted: (cwd: string | null, muted: boolean) => void;
  setSecondaryRailOpen: (cwd: string | null, tab: WorkbenchTab, open: boolean) => void;
  setSecondaryRailWidth: (cwd: string | null, tab: WorkbenchTab, width: number) => void;
  setActiveTerminal: (cwd: string | null, terminalId: string) => void;
  addTerminalSession: (cwd: string | null, session: TerminalSessionEntry) => void;
  removeTerminalSession: (cwd: string | null, terminalId: string) => void;
}

interface PersistedShellPanelsState {
  leftOpen?: boolean;
  leftW?: number;
  byCwd?: Record<string, PersistedWorkbenchPanelState>;
}

interface PersistedWorkbenchPanelState {
  rightOpen?: boolean;
  rightW?: number;
  activeTab?: WorkbenchTab;
  muted?: boolean;
}

const DEFAULT_LEFT_PANEL_STATE: LeftPanelState = Object.freeze({
  leftOpen: true,
  leftW: 180,
});

const DEFAULT_WORKBENCH_PANEL_STATE: WorkbenchPanelState = Object.freeze({
  rightOpen: true,
  rightW: 400,
  activeTab: "files",
  muted: false,
});

const DEFAULT_SECONDARY_RAIL: SecondaryRailState = Object.freeze({
  open: true,
  width: SECONDARY_RAIL_DEFAULT_WIDTH,
});

const DEFAULT_TERMINAL_SESSION_ID = "default";

const DEFAULT_TERMINAL_SESSIONS: TerminalSessionsState = Object.freeze({
  activeId: DEFAULT_TERMINAL_SESSION_ID,
  sessions: [{ id: DEFAULT_TERMINAL_SESSION_ID, label: "Terminal" }],
});

function clampWidth(width: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(width) ? width : min));
}

function resolveCwdKey(cwd: string | null): string {
  const trimmed = cwd?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_CWD_KEY;
}

function readPersistedPanels(): {
  leftOpen: boolean;
  leftW: number;
  byCwd: Record<string, WorkbenchPanelState>;
} {
  if (typeof window === "undefined") {
    return { ...DEFAULT_LEFT_PANEL_STATE, byCwd: {} };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...DEFAULT_LEFT_PANEL_STATE, byCwd: {} };
  }

  try {
    const parsed = JSON.parse(raw) as PersistedShellPanelsState | null;
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_LEFT_PANEL_STATE, byCwd: {} };
    }

    const byCwd: Record<string, WorkbenchPanelState> = {};
    for (const [cwd, value] of Object.entries(parsed.byCwd ?? {})) {
      const rawTab =
        value?.activeTab === "files" ||
        value?.activeTab === "git" ||
        value?.activeTab === "terminal"
          ? value.activeTab
          : value?.activeTab === "browser"
            ? DEFAULT_WORKBENCH_PANEL_STATE.activeTab
            : null;
      const activeTab = rawTab ?? DEFAULT_WORKBENCH_PANEL_STATE.activeTab;
      const normalized: WorkbenchPanelState = {
        rightOpen:
          typeof value?.rightOpen === "boolean"
            ? value.rightOpen
            : DEFAULT_WORKBENCH_PANEL_STATE.rightOpen,
        rightW: clampWidth(
          typeof value?.rightW === "number" ? value.rightW : DEFAULT_WORKBENCH_PANEL_STATE.rightW,
          RIGHT_WORKBENCH_WIDTH_LIMITS.min,
          RIGHT_WORKBENCH_WIDTH_LIMITS.max,
        ),
        activeTab,
        muted:
          typeof value?.muted === "boolean" ? value.muted : DEFAULT_WORKBENCH_PANEL_STATE.muted,
      };
      byCwd[cwd && cwd !== DEFAULT_CWD_KEY ? cwd : DEFAULT_CWD_KEY] = normalized;
    }

    return {
      leftOpen:
        typeof parsed.leftOpen === "boolean" ? parsed.leftOpen : DEFAULT_LEFT_PANEL_STATE.leftOpen,
      leftW: clampWidth(
        typeof parsed.leftW === "number" ? parsed.leftW : DEFAULT_LEFT_PANEL_STATE.leftW,
        SHELL_LEFT_PANEL_WIDTH_LIMITS.min,
        SHELL_LEFT_PANEL_WIDTH_LIMITS.max,
      ),
      byCwd,
    };
  } catch {
    return { ...DEFAULT_LEFT_PANEL_STATE, byCwd: {} };
  }
}

function persistPanels(input: {
  leftOpen: boolean;
  leftW: number;
  byCwd: Record<string, WorkbenchPanelState>;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
}

function railKey(cwd: string | null, tab: WorkbenchTab): string {
  return `${resolveCwdKey(cwd)}::${tab}`;
}

function readPersistedSecondaryRails(): Record<string, SecondaryRailState> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(SECONDARY_RAIL_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<SecondaryRailState>> | null;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, SecondaryRailState> = {};
    for (const [key, value] of Object.entries(parsed)) {
      result[key] = {
        open: typeof value?.open === "boolean" ? value.open : DEFAULT_SECONDARY_RAIL.open,
        width: clampWidth(
          typeof value?.width === "number" ? value.width : DEFAULT_SECONDARY_RAIL.width,
          SECONDARY_RAIL_LIMITS.min,
          SECONDARY_RAIL_LIMITS.max,
        ),
      };
    }
    return result;
  } catch {
    return {};
  }
}

function persistSecondaryRails(data: Record<string, SecondaryRailState>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SECONDARY_RAIL_STORAGE_KEY, JSON.stringify(data));
}

function readPersistedTerminalSessions(): Record<string, TerminalSessionsState> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(TERMINAL_SESSIONS_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, TerminalSessionsState> | null;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, TerminalSessionsState> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value?.activeId || !Array.isArray(value.sessions) || value.sessions.length === 0) {
        continue;
      }
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function persistTerminalSessions(data: Record<string, TerminalSessionsState>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TERMINAL_SESSIONS_STORAGE_KEY, JSON.stringify(data));
}

function getPanelState(
  byCwd: Record<string, WorkbenchPanelState>,
  cwd: string | null,
): WorkbenchPanelState {
  return byCwd[resolveCwdKey(cwd)] ?? DEFAULT_WORKBENCH_PANEL_STATE;
}

function arePanelStatesEqual(left: WorkbenchPanelState, right: WorkbenchPanelState): boolean {
  return (
    left.rightOpen === right.rightOpen &&
    left.rightW === right.rightW &&
    left.activeTab === right.activeTab &&
    left.muted === right.muted
  );
}

const INITIAL_PANELS = readPersistedPanels();
const INITIAL_RAILS = readPersistedSecondaryRails();
const INITIAL_TERMINAL_SESSIONS = readPersistedTerminalSessions();

export const useShellPanelsStore = create<ShellPanelsStoreState>()((set) => ({
  leftOpen: INITIAL_PANELS.leftOpen,
  leftW: INITIAL_PANELS.leftW,
  byCwd: INITIAL_PANELS.byCwd,
  railByCwdAndTab: INITIAL_RAILS,
  terminalByCwd: INITIAL_TERMINAL_SESSIONS,
  setLeftOpen: (leftOpen) => {
    set((state) => {
      if (state.leftOpen === leftOpen) {
        return state;
      }

      persistPanels({ leftOpen, leftW: state.leftW, byCwd: state.byCwd });
      return { leftOpen };
    });
  },
  setRightOpen: (cwd, rightOpen) => {
    set((state) => {
      const key = resolveCwdKey(cwd);
      const current = getPanelState(state.byCwd, cwd);
      const next = current.rightOpen === rightOpen ? current : { ...current, rightOpen };
      if (arePanelStatesEqual(current, next)) {
        return state;
      }

      const byCwd = { ...state.byCwd, [key]: next };
      persistPanels({ leftOpen: state.leftOpen, leftW: state.leftW, byCwd });
      return { byCwd };
    });
  },
  setLeftWidth: (width) => {
    set((state) => {
      const nextWidth = clampWidth(
        width,
        SHELL_LEFT_PANEL_WIDTH_LIMITS.min,
        SHELL_LEFT_PANEL_WIDTH_LIMITS.max,
      );
      if (state.leftW === nextWidth) {
        return state;
      }

      persistPanels({ leftOpen: state.leftOpen, leftW: nextWidth, byCwd: state.byCwd });
      return { leftW: nextWidth };
    });
  },
  setRightWidth: (cwd, width) => {
    set((state) => {
      const key = resolveCwdKey(cwd);
      const current = getPanelState(state.byCwd, cwd);
      const nextWidth = clampWidth(
        width,
        RIGHT_WORKBENCH_WIDTH_LIMITS.min,
        RIGHT_WORKBENCH_WIDTH_LIMITS.max,
      );
      const next = current.rightW === nextWidth ? current : { ...current, rightW: nextWidth };
      if (arePanelStatesEqual(current, next)) {
        return state;
      }

      const byCwd = { ...state.byCwd, [key]: next };
      persistPanels({ leftOpen: state.leftOpen, leftW: state.leftW, byCwd });
      return { byCwd };
    });
  },
  setActiveTab: (cwd, activeTab) => {
    set((state) => {
      const key = resolveCwdKey(cwd);
      const current = getPanelState(state.byCwd, cwd);
      const next =
        current.activeTab === activeTab && current.rightOpen
          ? current
          : {
              ...current,
              activeTab,
              rightOpen: true,
            };
      if (arePanelStatesEqual(current, next)) {
        return state;
      }

      const byCwd = { ...state.byCwd, [key]: next };
      persistPanels({ leftOpen: state.leftOpen, leftW: state.leftW, byCwd });
      return { byCwd };
    });
  },
  setMuted: (cwd, muted) => {
    set((state) => {
      const key = resolveCwdKey(cwd);
      const current = getPanelState(state.byCwd, cwd);
      const next = current.muted === muted ? current : { ...current, muted };
      if (arePanelStatesEqual(current, next)) {
        return state;
      }

      const byCwd = { ...state.byCwd, [key]: next };
      persistPanels({ leftOpen: state.leftOpen, leftW: state.leftW, byCwd });
      return { byCwd };
    });
  },
  setSecondaryRailOpen: (cwd, tab, open) => {
    set((state) => {
      const key = railKey(cwd, tab);
      const current = state.railByCwdAndTab[key] ?? DEFAULT_SECONDARY_RAIL;
      if (current.open === open) return state;
      const railByCwdAndTab = { ...state.railByCwdAndTab, [key]: { ...current, open } };
      persistSecondaryRails(railByCwdAndTab);
      return { railByCwdAndTab };
    });
  },
  setSecondaryRailWidth: (cwd, tab, width) => {
    set((state) => {
      const key = railKey(cwd, tab);
      const current = state.railByCwdAndTab[key] ?? DEFAULT_SECONDARY_RAIL;
      const clamped = clampWidth(width, SECONDARY_RAIL_LIMITS.min, SECONDARY_RAIL_LIMITS.max);
      if (current.width === clamped) return state;
      const railByCwdAndTab = { ...state.railByCwdAndTab, [key]: { ...current, width: clamped } };
      persistSecondaryRails(railByCwdAndTab);
      return { railByCwdAndTab };
    });
  },
  setActiveTerminal: (cwd, terminalId) => {
    set((state) => {
      const key = resolveCwdKey(cwd);
      const current = state.terminalByCwd[key] ?? DEFAULT_TERMINAL_SESSIONS;
      if (current.activeId === terminalId) return state;
      if (!current.sessions.some((s) => s.id === terminalId)) return state;
      const terminalByCwd = { ...state.terminalByCwd, [key]: { ...current, activeId: terminalId } };
      persistTerminalSessions(terminalByCwd);
      return { terminalByCwd };
    });
  },
  addTerminalSession: (cwd, session) => {
    set((state) => {
      const key = resolveCwdKey(cwd);
      const current = state.terminalByCwd[key] ?? DEFAULT_TERMINAL_SESSIONS;
      if (current.sessions.some((s) => s.id === session.id)) return state;
      const next: TerminalSessionsState = {
        activeId: session.id,
        sessions: [...current.sessions, session],
      };
      const terminalByCwd = { ...state.terminalByCwd, [key]: next };
      persistTerminalSessions(terminalByCwd);
      return { terminalByCwd };
    });
  },
  removeTerminalSession: (cwd, terminalId) => {
    set((state) => {
      const key = resolveCwdKey(cwd);
      const current = state.terminalByCwd[key] ?? DEFAULT_TERMINAL_SESSIONS;
      const remaining = current.sessions.filter((s) => s.id !== terminalId);
      if (remaining.length === current.sessions.length) return state;
      if (remaining.length === 0) return state;
      const activeId =
        current.activeId === terminalId
          ? (remaining[Math.max(0, current.sessions.findIndex((s) => s.id === terminalId) - 1)]
              ?.id ?? remaining[0]!.id)
          : current.activeId;
      const next: TerminalSessionsState = { activeId, sessions: remaining };
      const terminalByCwd = { ...state.terminalByCwd, [key]: next };
      persistTerminalSessions(terminalByCwd);
      return { terminalByCwd };
    });
  },
}));

function selectPanelState(state: ShellPanelsStoreState, cwd: string | null): WorkbenchPanelState {
  return state.byCwd[resolveCwdKey(cwd)] ?? DEFAULT_WORKBENCH_PANEL_STATE;
}

export function useLeftOpen(): boolean {
  return useShellPanelsStore((state) => state.leftOpen);
}

export function useRightOpen(cwd: string | null): boolean {
  return useShellPanelsStore((state) => selectPanelState(state, cwd).rightOpen);
}

export function useLeftWidth(): number {
  return useShellPanelsStore((state) => state.leftW);
}

export function useRightWidth(cwd: string | null): number {
  return useShellPanelsStore((state) => selectPanelState(state, cwd).rightW);
}

export function useActiveTab(cwd: string | null): WorkbenchTab {
  return useShellPanelsStore((state) => selectPanelState(state, cwd).activeTab);
}

export function useIsMuted(cwd: string | null): boolean {
  return useShellPanelsStore((state) => selectPanelState(state, cwd).muted);
}

export function useSecondaryRail(cwd: string | null, tab: WorkbenchTab): SecondaryRailState {
  return useShellPanelsStore(
    (state) => state.railByCwdAndTab[railKey(cwd, tab)] ?? DEFAULT_SECONDARY_RAIL,
  );
}

export function useTerminalSessions(cwd: string | null): TerminalSessionsState {
  return useShellPanelsStore(
    (state) => state.terminalByCwd[resolveCwdKey(cwd)] ?? DEFAULT_TERMINAL_SESSIONS,
  );
}

export const shellPanelsActions = {
  setLeftOpen: (open: boolean) => useShellPanelsStore.getState().setLeftOpen(open),
  setRightOpen: (cwd: string | null, open: boolean) =>
    useShellPanelsStore.getState().setRightOpen(cwd, open),
  setLeftWidth: (width: number) => useShellPanelsStore.getState().setLeftWidth(width),
  setRightWidth: (cwd: string | null, width: number) =>
    useShellPanelsStore.getState().setRightWidth(cwd, width),
  setActiveTab: (cwd: string | null, tab: WorkbenchTab) =>
    useShellPanelsStore.getState().setActiveTab(cwd, tab),
  setMuted: (cwd: string | null, muted: boolean) =>
    useShellPanelsStore.getState().setMuted(cwd, muted),
  toggleLeft: () => {
    const current = useShellPanelsStore.getState().leftOpen;
    useShellPanelsStore.getState().setLeftOpen(!current);
  },
  toggleRight: (cwd: string | null) => {
    const current = getPanelState(useShellPanelsStore.getState().byCwd, cwd);
    useShellPanelsStore.getState().setRightOpen(cwd, !current.rightOpen);
  },
  setSecondaryRailOpen: (cwd: string | null, tab: WorkbenchTab, open: boolean) =>
    useShellPanelsStore.getState().setSecondaryRailOpen(cwd, tab, open),
  setSecondaryRailWidth: (cwd: string | null, tab: WorkbenchTab, width: number) =>
    useShellPanelsStore.getState().setSecondaryRailWidth(cwd, tab, width),
  toggleSecondaryRail: (cwd: string | null, tab: WorkbenchTab) => {
    const key = railKey(cwd, tab);
    const current = useShellPanelsStore.getState().railByCwdAndTab[key] ?? DEFAULT_SECONDARY_RAIL;
    useShellPanelsStore.getState().setSecondaryRailOpen(cwd, tab, !current.open);
  },
  setActiveTerminal: (cwd: string | null, terminalId: string) =>
    useShellPanelsStore.getState().setActiveTerminal(cwd, terminalId),
  addTerminalSession: (cwd: string | null, session: TerminalSessionEntry) =>
    useShellPanelsStore.getState().addTerminalSession(cwd, session),
  removeTerminalSession: (cwd: string | null, terminalId: string) =>
    useShellPanelsStore.getState().removeTerminalSession(cwd, terminalId),
};
