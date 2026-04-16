// @ts-nocheck
import { useMemo, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";

import { SHELL_LAYOUT_CHANGED_EVENT } from "../lib/shell-runtime-constants";
import { useServerAvailableEditors } from "../rpc/server-state";
import {
  selectProjectsAcrossEnvironments,
  selectThreadsAcrossEnvironments,
  useStore,
} from "../store";
import { useRouteThreadId } from "./use-route-thread-id";

const WORKSPACE_KEY = "multi:workspace-cwd";

function readStoredCwd() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(WORKSPACE_KEY)?.trim();
  return raw && raw.length > 0 ? raw : null;
}

function basename(cwd: string | null) {
  if (!cwd) return null;
  const clean = cwd.replace(/[\\/]+$/, "");
  const cut = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
  return cut >= 0 ? clean.slice(cut + 1) : clean;
}

function subscribe(listener: () => void) {
  window.addEventListener(SHELL_LAYOUT_CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener(SHELL_LAYOUT_CHANGED_EVENT, listener);
  };
}

export function useShellState() {
  const editors = useServerAvailableEditors();
  const routeThreadId = useRouteThreadId();
  const projects = useStore(useShallow(selectProjectsAcrossEnvironments));
  const threads = useStore(useShallow(selectThreadsAcrossEnvironments));
  const stored = useSyncExternalStore(subscribe, readStoredCwd, () => null);

  return useMemo(() => {
    const byId = new Map(projects.map((item) => [item.id, item]));
    const thread = routeThreadId ? threads.find((item) => item.id === routeThreadId) : null;
    const storedProject = projects.find((item) => item.cwd === stored) ?? null;
    const threadProject = thread ? (byId.get(thread.projectId) ?? null) : null;
    const project = storedProject ?? threadProject ?? projects[0] ?? null;
    const cwd = thread?.worktreePath ?? project?.cwd ?? null;

    return {
      cwd,
      name: basename(cwd),
      home: null,
      availableEditors: [...editors],
    };
  }, [editors, projects, routeThreadId, stored, threads]);
}
