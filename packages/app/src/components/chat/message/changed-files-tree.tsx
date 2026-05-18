import { type TurnId } from "@multi/contracts";
import { prepareFileTreeInput } from "@pierre/trees";
import type { FileTreeRowDecoration, FileTreeRowDecorationRenderer } from "@pierre/trees";
import { memo, useMemo, useRef } from "react";

import { type TurnDiffFileChange } from "../../../types";
import { normalizeTreePath, Tree, useTreeModel } from "../../tree";

function readFileStatDecoration(file: TurnDiffFileChange): FileTreeRowDecoration | null {
  if (typeof file.additions !== "number" || typeof file.deletions !== "number") {
    return null;
  }
  if (file.additions === 0 && file.deletions === 0) {
    return null;
  }
  const text = `+${file.additions}/-${file.deletions}`;
  return { text, title: text };
}

function getEstimatedTreeHeight(fileCount: number): number {
  return Math.min(Math.max(fileCount * 22, 28), 320);
}

function collectDirectoryPaths(paths: readonly string[]): string[] {
  const directoryPaths = new Set<string>();
  for (const path of paths) {
    const segments = path.split("/").filter((segment) => segment.length > 0);
    for (let index = 1; index < segments.length; index += 1) {
      directoryPaths.add(segments.slice(0, index).join("/"));
    }
  }
  return [...directoryPaths];
}

export const ChangedFilesTree = memo(function ChangedFilesTree(props: {
  turnId: TurnId;
  files: ReadonlyArray<TurnDiffFileChange>;
  allDirectoriesExpanded: boolean;
  resolvedTheme: "light" | "dark";
  onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
}) {
  const { files, allDirectoriesExpanded, onOpenTurnDiff, resolvedTheme, turnId } = props;
  const treePaths = useMemo(
    () => files.map((file) => normalizeTreePath(file.path)).filter((path) => path.length > 0),
    [files],
  );
  const treePathsKey = useMemo(() => treePaths.join("\0"), [treePaths]);
  const directoryPaths = useMemo(() => collectDirectoryPaths(treePaths), [treePaths]);
  const filePathSet = useMemo(() => new Set(treePaths), [treePaths]);
  const rowDecorationsByPath = useMemo(() => {
    const decorations = new Map<string, FileTreeRowDecoration>();
    for (const file of files) {
      const path = normalizeTreePath(file.path);
      const decoration = readFileStatDecoration(file);
      if (decoration) {
        decorations.set(path, decoration);
      }
    }
    return decorations;
  }, [files]);

  return (
    <ChangedFilesTreeModel
      key={`${turnId}:${allDirectoriesExpanded ? "all" : "default"}:${treePathsKey}`}
      allDirectoriesExpanded={allDirectoriesExpanded}
      directoryPaths={directoryPaths}
      filePathSet={filePathSet}
      onOpenTurnDiff={onOpenTurnDiff}
      resolvedTheme={resolvedTheme}
      rowDecorationsByPath={rowDecorationsByPath}
      treePaths={treePaths}
      treePathsKey={treePathsKey}
      turnId={turnId}
    />
  );
});

function ChangedFilesTreeModel(props: {
  readonly allDirectoriesExpanded: boolean;
  readonly directoryPaths: readonly string[];
  readonly filePathSet: ReadonlySet<string>;
  readonly onOpenTurnDiff: (turnId: TurnId, filePath?: string) => void;
  readonly resolvedTheme: "light" | "dark";
  readonly rowDecorationsByPath: ReadonlyMap<string, FileTreeRowDecoration>;
  readonly treePaths: readonly string[];
  readonly treePathsKey: string;
  readonly turnId: TurnId;
}) {
  const filePathSetRef = useRef<ReadonlySet<string>>(new Set());
  const onOpenTurnDiffRef = useRef(props.onOpenTurnDiff);
  const rowDecorationsByPathRef = useRef<ReadonlyMap<string, FileTreeRowDecoration>>(new Map());
  const turnIdRef = useRef(props.turnId);
  const treeIdentityRef = useRef({ turnId: props.turnId, treePathsKey: props.treePathsKey });
  const lastOpenedPathRef = useRef<{
    readonly turnId: TurnId;
    readonly treePathsKey: string;
    readonly path: string;
  } | null>(null);

  onOpenTurnDiffRef.current = props.onOpenTurnDiff;
  turnIdRef.current = props.turnId;

  const preparedInput = useMemo(() => prepareFileTreeInput(props.treePaths), [props.treePaths]);
  const renderRowDecoration = useMemo<FileTreeRowDecorationRenderer>(
    () =>
      ({ row }) =>
        row.kind === "file" ? (rowDecorationsByPathRef.current.get(row.path) ?? null) : null,
    [],
  );

  filePathSetRef.current = props.filePathSet;
  rowDecorationsByPathRef.current = props.rowDecorationsByPath;
  treeIdentityRef.current = { turnId: props.turnId, treePathsKey: props.treePathsKey };

  const { model } = useTreeModel({
    paths: props.treePaths,
    preparedInput,
    initialExpansion: props.allDirectoriesExpanded ? "open" : "closed",
    initialExpandedPaths: props.allDirectoriesExpanded ? props.directoryPaths : [],
    renderRowDecoration,
    onSelectionChange: (selectedPaths) => {
      const path = selectedPaths[0] ?? null;
      const currentIdentity = treeIdentityRef.current;
      const lastOpened = lastOpenedPathRef.current;
      if (
        !path ||
        (lastOpened?.path === path &&
          lastOpened.turnId === currentIdentity.turnId &&
          lastOpened.treePathsKey === currentIdentity.treePathsKey) ||
        !filePathSetRef.current.has(path)
      ) {
        return;
      }
      lastOpenedPathRef.current = { ...currentIdentity, path };
      onOpenTurnDiffRef.current(turnIdRef.current, path);
    },
  });

  return (
    <div
      className="min-h-0 overflow-hidden"
      style={{ height: getEstimatedTreeHeight(props.treePaths.length) }}
    >
      <Tree model={model} resolvedTheme={props.resolvedTheme} />
    </div>
  );
}
