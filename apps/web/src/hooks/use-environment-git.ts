// @ts-nocheck
import type { FileDiffMetadata } from "@pierre/diffs";
import type { EnvironmentId, GitStatusResult } from "@t3tools/contracts";
import type { GitFileSummary, GitState } from "~/lib/glass-types";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import * as Schema from "effect/Schema";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { gitPatchQueryOptions, gitQueryKeys } from "../lib/glass-git-react-query";
import { readGlassGitApi } from "../lib/glass-git-api";
import { useGlassShellStore } from "../lib/glass-shell-store";
import { selectBootstrapCompleteForActiveEnvironment, useStore } from "../store";
import { getWsRpcClientForEnvironment } from "../ws-rpc-client";
import { useLocalStorage } from "./use-local-storage";
import { useShellState } from "./use-shell-cwd";

const DiffStyle = Schema.Literals(["unified", "split"]);

export function useGlassDiffStylePreference() {
  return useLocalStorage<"unified" | "split", "unified" | "split">(
    "glass:git-diff-style",
    "unified",
    DiffStyle,
  );
}

export interface DiffRow extends GitFileSummary {
  add: number;
  del: number;
}

export interface GlassGitPanelModel {
  snap: GitState | null;
  loading: boolean;
  error: string | null;
  count: number;
  branch: string | null;
  rows: DiffRow[];
  totalAdd: number;
  totalDel: number;
  statsById: Map<string, { add: number; del: number }>;
  focusId: string | null;
  diffsByPath: Map<string, FileDiffMetadata | null>;
  patchesByPath: Map<string, string>;
  diffLoadingByPath: Set<string>;
  diffErrorByPath: Map<string, string>;
  expandedIds: Set<string>;
  toggleExpand: (id: string, open?: boolean) => void;
  expandAll: () => void;
  collapseAll: () => void;
  refresh: () => Promise<GitState | null>;
  init: () => Promise<GitState | null>;
  discard: (paths: string[]) => Promise<GitState | null>;
  runCommit: (input: { message: string; push?: boolean }) => Promise<void>;
  runBranchCommit: (input: { message: string; push?: boolean }) => Promise<void>;
  runPush: () => Promise<void>;
}

function clean(path: string) {
  const raw = path.replace(/\\/g, "/");
  const win = /^[A-Za-z]:\//.test(raw) ? raw.slice(0, 2) : "";
  const abs = win.length > 0 || raw.startsWith("/");
  const body = (win ? raw.slice(2) : raw).split("/");
  const out: string[] = [];
  for (const seg of body) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  if (win) return out.length > 0 ? `${win}/${out.join("/")}` : `${win}/`;
  if (abs) return out.length > 0 ? `/${out.join("/")}` : "/";
  return out.join("/");
}

function join(base: string, path: string) {
  const next = clean(path);
  if (next.startsWith("/") || /^[A-Za-z]:\//.test(next)) return next;
  return clean(`${clean(base)}/${next}`);
}

function rel(path: string, root: string) {
  const file = clean(path);
  const base = clean(root).replace(/\/+$/, "");
  if (file === base) return "";
  if (!file.startsWith(`${base}/`)) return null;
  return file.slice(base.length + 1);
}

function pick(path: string, cwd: string, root: string | null) {
  if (!root) return null;
  if (path.startsWith("~/")) return null;
  const file = path.startsWith("/") || /^[A-Za-z]:\//.test(path) ? clean(path) : join(cwd, path);
  return rel(file, root);
}

function hit(paths: string[], cwd: string, root: string | null, files: DiffRow[]) {
  for (const path of paths) {
    const next = pick(path, cwd, root);
    if (next === null) continue;
    const file = files.find((r) => r.path === next || r.prevPath === next);
    if (file) return file;
  }
  return null;
}

function toItem(item: GitStatusResult["workingTree"]["files"][number]) {
  return {
    id: item.path,
    path: item.path,
    prevPath: item.prevPath,
    state: item.state,
    staged: false,
    unstaged: true,
  } satisfies GitFileSummary;
}

function toRow(item: GitStatusResult["workingTree"]["files"][number]) {
  return {
    ...toItem(item),
    add: item.insertions,
    del: item.deletions,
  } satisfies DiffRow;
}

function toRows(status: GitStatusResult | null) {
  if (!status) return [] as DiffRow[];
  return status.workingTree.files.map(toRow);
}

export function syncRows(prev: DiffRow[], next: DiffRow[]) {
  const rows = new Map(prev.map((row) => [row.id, row]));
  const ids = new Set<string>();
  const drop = new Set<string>();

  for (const row of next) {
    ids.add(row.id);
    const cur = rows.get(row.id);
    if (!cur) continue;
    if (
      cur.path === row.path &&
      cur.prevPath === row.prevPath &&
      cur.state === row.state &&
      cur.add === row.add &&
      cur.del === row.del
    ) {
      continue;
    }
    drop.add(row.id);
  }

  return { ids, drop };
}

function toSnap(cwd: string, status: GitStatusResult): GitState {
  return {
    cwd,
    gitRoot: status.isRepo ? cwd : null,
    repo: status.isRepo,
    clean: !status.hasWorkingTreeChanges || status.workingTree.files.length === 0,
    count: status.workingTree.files.length,
    files: status.workingTree.files.map(toItem),
    patch: "",
  };
}

export function useGlassGitPanel(environmentId?: EnvironmentId | null): GlassGitPanelModel {
  const { cwd } = useShellState();
  const boot = useStore(selectBootstrapCompleteForActiveEnvironment);
  const paths = useGlassShellStore((state) => state.paths);
  const tick = useGlassShellStore((state) => state.tick);
  const qc = useQueryClient();

  const [git, setGit] = useState(() => ({
    cwd: null as string | null,
    snap: null as GitState | null,
    status: null as GitStatusResult | null,
    err: null as string | null,
    loading: false,
  }));

  const seq = useRef(0);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const prevRows = useRef<DiffRow[]>([]);

  const load = useCallback(
    async (opts?: { reset?: boolean }) => {
      const api = readGlassGitApi(environmentId);
      if (!api || !cwd) return null;
      const id = ++seq.current;
      setGit((state) =>
        state.cwd === cwd && !opts?.reset
          ? { ...state, loading: true }
          : { cwd, snap: null, status: null, err: null, loading: true },
      );
      try {
        const next = await api.refreshStatus({ cwd });
        if (seq.current !== id) return null;
        const snap = toSnap(cwd, next);
        setGit({ cwd, snap, status: next, err: null, loading: false });
        return snap;
      } catch (err) {
        if (seq.current !== id) return null;
        setGit({
          cwd,
          snap: null,
          status: null,
          err: err instanceof Error ? err.message : String(err),
          loading: false,
        });
        return null;
      }
    },
    [cwd, environmentId],
  );

  useEffect(() => {
    const api = readGlassGitApi(environmentId);
    if (!api || !cwd) {
      seq.current += 1;
      prevRows.current = [];
      setGit({ cwd: null, snap: null, status: null, err: null, loading: false });
      setExpandedIds(new Set());
      return;
    }

    let active = true;
    let off: () => void = () => {};

    void load({ reset: true }).then(() => {
      if (!active) return;
      off = api.onStatus(
        { cwd },
        (next) => {
          setGit((state) => {
            if (state.cwd !== cwd) return state;
            return { cwd, snap: toSnap(cwd, next), status: next, err: null, loading: false };
          });
        },
        { onResubscribe: () => void load() },
      );
    });

    return () => {
      active = false;
      off();
    };
  }, [cwd, environmentId, load]);

  const cur = git.cwd === cwd ? git : null;

  useEffect(() => {
    if (!cwd) return;
    const sync = () => {
      if (document.visibilityState === "hidden") return;
      void load();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [cwd, load]);

  useEffect(() => {
    if (!cwd || tick < 1) return;
    void load();
  }, [cwd, load, tick]);

  const curSnap = cur?.snap ?? null;
  const curErr = cur?.err ?? null;
  const rows = useMemo(() => toRows(cur?.status ?? null), [cur?.status]);
  const curRows = useMemo(() => (curSnap ? rows : []), [curSnap, rows]);
  const pending =
    (cwd !== null && cur === null) || Boolean(cur?.loading) || (!boot && cwd === null);

  const branch = cur?.status?.branch ?? null;

  const recent = useMemo(() => {
    if (!cwd || !curSnap) return null;
    return hit(paths, cwd, curSnap.gitRoot ?? null, curRows);
  }, [curRows, curSnap, cwd, paths]);

  useEffect(() => {
    const prev = prevRows.current;
    const next = syncRows(prevRows.current, curRows);
    prevRows.current = curRows;
    setExpandedIds((prev) => {
      let changed = false;
      const ids = new Set<string>();
      for (const id of prev) {
        if (!next.ids.has(id)) {
          changed = true;
          continue;
        }
        ids.add(id);
      }
      return changed ? ids : prev;
    });
    if (!cwd) return;

    const gone = new Set(prev.map((row) => row.id));
    for (const row of curRows) {
      gone.delete(row.id);
    }

    for (const id of gone) {
      qc.removeQueries({
        queryKey: gitQueryKeys.patch(environmentId ?? null, cwd, id),
        exact: true,
      });
    }
    for (const id of next.drop) {
      void qc.invalidateQueries({
        queryKey: gitQueryKeys.patch(environmentId ?? null, cwd, id),
        exact: true,
      });
    }
  }, [curRows, cwd, environmentId, qc]);

  const open = useMemo(
    () => curRows.filter((row) => expandedIds.has(row.id)).map((row) => row.id),
    [curRows, expandedIds],
  );

  const files = useQueries({
    queries: open.map((path) =>
      gitPatchQueryOptions({
        environmentId: environmentId ?? null,
        cwd,
        path,
        enabled: Boolean(cwd),
      }),
    ),
  });

  const diffs = new Map<string, FileDiffMetadata | null>();
  const patches = new Map<string, string>();
  const loading = new Set<string>();
  const errors = new Map<string, string>();

  for (const [index, path] of open.entries()) {
    const file = files[index];
    if (!file) continue;
    if (file.data) {
      diffs.set(path, file.data.diff);
      patches.set(path, file.data.patch);
    }
    if (!file.data && (file.isPending || file.fetchStatus === "fetching")) {
      loading.add(path);
    }
    if (!file.data && file.error) {
      errors.set(path, file.error instanceof Error ? file.error.message : String(file.error));
    }
  }

  const toggleExpand = useCallback((id: string, open?: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      const show = open ?? !next.has(id);
      if (!show) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(curRows.map((row) => row.id)));
  }, [curRows]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const statsById = useMemo(
    () => new Map(curRows.map((r) => [r.id, { add: r.add, del: r.del }])),
    [curRows],
  );

  const runCommit = useCallback(
    async (input: { message: string; push?: boolean }) => {
      if (!cwd) throw new Error("No workspace");
      const rpc = getWsRpcClientForEnvironment(environmentId ?? null);
      await rpc.git.runStackedAction({
        actionId: crypto.randomUUID(),
        cwd,
        action: input.push ? "commit_push" : "commit",
        commitMessage: input.message,
      });
    },
    [cwd, environmentId],
  );

  const runBranchCommit = useCallback(
    async (input: { message: string; push?: boolean }) => {
      if (!cwd) throw new Error("No workspace");
      const rpc = getWsRpcClientForEnvironment(environmentId ?? null);
      await rpc.git.runStackedAction({
        actionId: crypto.randomUUID(),
        cwd,
        action: input.push ? "commit_push" : "commit",
        commitMessage: input.message,
        featureBranch: true,
      });
    },
    [cwd, environmentId],
  );

  const runPush = useCallback(async () => {
    if (!cwd) throw new Error("No workspace");
    const rpc = getWsRpcClientForEnvironment(environmentId ?? null);
    await rpc.git.runStackedAction({
      actionId: crypto.randomUUID(),
      cwd,
      action: "push",
    });
  }, [cwd, environmentId]);

  return {
    snap: curSnap,
    loading: pending,
    error: curErr,
    count: curSnap?.count ?? 0,
    branch,
    rows: curRows,
    totalAdd: curRows.reduce((sum, r) => sum + r.add, 0),
    totalDel: curRows.reduce((sum, r) => sum + r.del, 0),
    statsById,
    focusId: recent?.id ?? null,
    diffsByPath: diffs,
    patchesByPath: patches,
    diffLoadingByPath: loading,
    diffErrorByPath: errors,
    expandedIds,
    toggleExpand,
    expandAll,
    collapseAll,
    refresh: load,
    init: async () => {
      const api = readGlassGitApi(environmentId);
      if (!api || !cwd) return null;
      try {
        await api.init({ cwd });
      } catch (err) {
        setGit((state) =>
          state.cwd !== cwd
            ? state
            : {
                ...state,
                err: err instanceof Error ? err.message : String(err),
                loading: false,
              },
        );
      }
      return load();
    },
    discard: async (paths) => {
      const api = readGlassGitApi(environmentId);
      if (!api || !cwd) return curSnap;
      try {
        await api.discardPaths({ cwd, paths });
      } catch (err) {
        setGit((state) =>
          state.cwd !== cwd
            ? state
            : {
                ...state,
                err: err instanceof Error ? err.message : String(err),
                loading: false,
              },
        );
      }
      return load();
    },
    runCommit,
    runBranchCommit,
    runPush,
  };
}
