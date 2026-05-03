"use client";

import { FileTree as PierreFileTree, useFileTree } from "@pierre/trees/react";
import type { GitStatus, GitStatusEntry } from "@pierre/trees";
import type {
  EditorId,
  EnvironmentId,
  GitWorkingTreeFileStatus,
  ProjectEntry,
} from "@multi/contracts";
import { useQuery } from "@tanstack/react-query";
import { IconArrowRotateClockwise } from "central-icons";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { resolveAndPersistPreferredEditor } from "~/editor-preferences";
import { useGitStatus } from "~/lib/git-status-state";
import { ensureNativeApi } from "~/lib/native-runtime-api";
import { projectListEntriesQueryOptions } from "~/lib/project-react-query";
import { cn } from "~/lib/utils";
import { useTheme } from "~/hooks/use-theme";

import { TREE_UNSAFE_CSS, useWorkbenchTreeHostStyle } from "./pierre-workbench-tree";
import { WorkbenchIconButton } from "../shell/workbench-icon-button";

const EMPTY_PROJECT_ENTRIES: readonly ProjectEntry[] = [];

function normalizeTreePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function basename(path: string | null): string {
  if (!path) return "Files";
  const clean = path.replace(/[\\/]+$/, "");
  const index = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
  return index === -1 ? clean : clean.slice(index + 1);
}

function projectEntryToTreePath(entry: ProjectEntry): string {
  const p = normalizeTreePath(entry.path);
  return entry.kind === "directory" ? `${p}/` : p;
}

function joinWorkspacePath(cwd: string, relativePath: string): string {
  const separator = cwd.includes("\\") && !cwd.includes("/") ? "\\" : "/";
  return `${cwd.replace(/[\\/]+$/, "")}${separator}${relativePath.replace(/^[\\/]+/, "")}`;
}

function formatEntryCount(count: number, truncated: boolean): string {
  if (count === 0) return "";
  if (count >= 1000) {
    const rounded = count >= 10_000 ? Math.round(count / 1000) : Math.round(count / 100) / 10;
    return `${rounded}k${truncated ? "+" : ""}`;
  }
  return `${count}${truncated ? "+" : ""}`;
}

function workingTreeFileStatusToTreesStatus(status: GitWorkingTreeFileStatus): GitStatus {
  switch (status) {
    case "added":
      return "added";
    case "deleted":
      return "deleted";
    case "ignored":
      return "ignored";
    case "renamed":
      return "renamed";
    case "untracked":
      return "untracked";
    case "conflict":
    case "modified":
    default:
      return "modified";
  }
}

function toGitStatusEntries(status: ReturnType<typeof useGitStatus>["data"]): GitStatusEntry[] {
  if (!status?.workingTree.files.length) {
    return [];
  }

  return status.workingTree.files.map((file) => ({
    path: normalizeTreePath(file.path),
    status: workingTreeFileStatusToTreesStatus(file.status),
  }));
}

export function WorkspaceFileTree(props: {
  cwd: string | null;
  environmentId: EnvironmentId | null;
  availableEditors: readonly EditorId[];
  onOpenFile?: (relativePath: string) => void;
  searchOpen?: boolean;
  selectedPath?: string | null;
  title?: string;
  className?: string;
}) {
  const filePathSetRef = useRef<ReadonlySet<string>>(new Set());
  const availableEditorsRef = useRef(props.availableEditors);
  const cwdRef = useRef(props.cwd);
  const onOpenFileRef = useRef(props.onOpenFile);
  const lastOpenedPathRef = useRef<string | null>(null);
  const suppressSelectionOpenRef = useRef<string | null>(null);
  const { resolvedTheme } = useTheme();

  const treeHostStyle = useWorkbenchTreeHostStyle(resolvedTheme);

  availableEditorsRef.current = props.availableEditors;
  cwdRef.current = props.cwd;
  onOpenFileRef.current = props.onOpenFile;

  const openPath = useCallback((relativePath: string) => {
    const cwd = cwdRef.current;
    if (!cwd) return;

    const editor = resolveAndPersistPreferredEditor(availableEditorsRef.current);
    if (!editor) {
      toast.error("No available editor found.");
      return;
    }

    const targetPath = joinWorkspacePath(cwd, relativePath);
    try {
      void ensureNativeApi()
        .shell.openInEditor(targetPath, editor)
        .catch((error: unknown) =>
          toast.error(error instanceof Error ? error.message : String(error)),
        );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const { model } = useFileTree({
    paths: [],
    density: "compact",
    itemHeight: 22,
    flattenEmptyDirectories: true,
    fileTreeSearchMode: "collapse-non-matches",
    initialExpansion: 1,
    icons: "complete",
    search: true,
    searchBlurBehavior: "retain",
    unsafeCSS: TREE_UNSAFE_CSS,
    onSelectionChange: (selectedPaths) => {
      const raw = selectedPaths[0] ?? null;
      const selectedPath = raw ? normalizeTreePath(raw) : null;
      if (
        !selectedPath ||
        selectedPath === lastOpenedPathRef.current ||
        !filePathSetRef.current.has(selectedPath)
      ) {
        return;
      }
      if (selectedPath === suppressSelectionOpenRef.current) {
        suppressSelectionOpenRef.current = null;
        lastOpenedPathRef.current = selectedPath;
        return;
      }
      lastOpenedPathRef.current = selectedPath;
      const onOpenFile = onOpenFileRef.current;
      if (onOpenFile) {
        onOpenFile(selectedPath);
        return;
      }
      openPath(selectedPath);
    },
  });

  const entriesQuery = useQuery(
    projectListEntriesQueryOptions({
      environmentId: props.environmentId,
      cwd: props.cwd,
      enabled: Boolean(props.environmentId && props.cwd),
    }),
  );
  const gitStatus = useGitStatus({ environmentId: props.environmentId, cwd: props.cwd });

  const entries = entriesQuery.data?.entries ?? EMPTY_PROJECT_ENTRIES;
  const truncated = entriesQuery.data?.truncated ?? false;
  const treePaths = useMemo(() => entries.map(projectEntryToTreePath), [entries]);
  const topLevelExpandedPaths = useMemo(
    () =>
      entries
        .filter((entry) => {
          if (entry.kind !== "directory") return false;
          return !normalizeTreePath(entry.path).includes("/");
        })
        .map((entry) => normalizeTreePath(entry.path)),
    [entries],
  );
  const filePathSet = useMemo(
    () =>
      new Set(
        entries
          .filter((entry) => entry.kind === "file")
          .map((entry) => normalizeTreePath(entry.path)),
      ),
    [entries],
  );
  const gitStatusEntries = useMemo(() => toGitStatusEntries(gitStatus.data), [gitStatus.data]);

  filePathSetRef.current = filePathSet;

  useEffect(() => {
    model.resetPaths(treePaths, { initialExpandedPaths: topLevelExpandedPaths });
  }, [model, topLevelExpandedPaths, treePaths]);

  useEffect(() => {
    const externalSelected = props.selectedPath ? normalizeTreePath(props.selectedPath) : null;
    if (!externalSelected) {
      for (const selectedPath of model.getSelectedPaths()) {
        model.getItem(selectedPath)?.deselect();
      }
      lastOpenedPathRef.current = null;
      return;
    }
    if (
      !filePathSet.has(externalSelected) ||
      normalizeTreePath(model.getSelectedPaths()[0] ?? "") === externalSelected
    ) {
      return;
    }
    const selectedItem = model.getItem(externalSelected);
    if (!selectedItem) {
      return;
    }
    suppressSelectionOpenRef.current = externalSelected;
    for (const selectedPath of model.getSelectedPaths()) {
      model.getItem(selectedPath)?.deselect();
    }
    selectedItem.select();
    model.focusPath(externalSelected);
  }, [filePathSet, model, props.selectedPath]);

  useEffect(() => {
    model.setGitStatus(gitStatusEntries);
  }, [gitStatusEntries, model]);

  useEffect(() => {
    if (props.searchOpen) {
      model.openSearch();
      return;
    }
    model.closeSearch();
  }, [model, props.searchOpen]);

  return (
    <section
      className={cn(
        "workspace-file-tree flex min-h-0 min-h-36 shrink-0 flex-col overflow-hidden bg-multi-bg-quinary text-multi-fg-primary",
        props.className,
      )}
    >
      <div className="multi-workbench-panel-title-row gap-2">
        <span className="min-w-0 shrink-0 truncate text-[12px]/[16px] font-medium text-multi-fg-primary">
          {props.title ?? basename(props.cwd)}
        </span>
        <span className="min-w-0 flex-1" />
        <span className="shrink-0 text-[11px]/[13px] text-multi-fg-quaternary tabular-nums">
          {formatEntryCount(entries.length, truncated)}
        </span>
        <WorkbenchIconButton
          aria-label="Refresh files"
          chrome="panel"
          onClick={() => {
            void entriesQuery.refetch();
          }}
        >
          <IconArrowRotateClockwise
            className={cn("size-3.5", entriesQuery.isFetching && "animate-spin")}
          />
        </WorkbenchIconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {props.cwd && props.environmentId ? (
          <PierreFileTree
            model={model}
            className="block h-full w-full"
            style={treeHostStyle}
            renderContextMenu={(item, context) => (
              <div
                className="min-w-32 rounded-multi-control border border-multi-border/70 bg-multi-bubble-opaque p-1 font-multi text-[12px]/[16px] text-foreground shadow-multi-popup"
                data-file-tree-context-menu-root="true"
              >
                <button
                  type="button"
                  className="flex min-h-6 w-full items-center rounded-sm px-2 text-left text-muted-foreground hover:bg-multi-hover hover:text-foreground"
                  onClick={() => {
                    context.close();
                    openPath(item.path);
                  }}
                >
                  Open in Editor
                </button>
              </div>
            )}
          />
        ) : (
          <div className="px-3 py-2 text-[11px]/[14px] text-muted-foreground/55">
            Add a project workspace to browse files.
          </div>
        )}

        {entriesQuery.isError ? (
          <div className="px-3 py-2 text-[11px]/[14px] text-destructive/80">
            Unable to load files.
          </div>
        ) : null}
      </div>
    </section>
  );
}
