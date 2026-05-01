"use client";

import {
  IconBarsThree,
  IconBranch,
  IconChevronBottom,
  IconChevronRight,
  IconDotGrid1x3Horizontal,
  IconSplit,
} from "central-icons";
import { Virtualizer } from "@pierre/diffs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@multi/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@multi/ui/dialog";
import { List } from "lucide-react";

import { isElectron } from "~/env";
import {
  type DiffRow,
  type GitPanelModel,
  useDiffStylePreference,
} from "~/hooks/use-environment-git";
import { useGitViewed } from "~/hooks/use-git-viewed-state";
import { shellPanelsActions, useSecondaryRail } from "~/lib/shell-panels-store";
import { cn } from "~/lib/utils";
import { BranchCommitDialog, CommitDialog } from "./commit-dialog";
import { GitChangesFileTree } from "./git-changes-file-tree";
import { GitDiffCard } from "./git-diff-card";
import { WorkbenchChromeRow } from "../shell/workbench-chrome-row";
import { RightWorkbenchLayout } from "../shell/right-workbench-layout";

/** Beyond this, expand-all prefetches every patch (expensive on large repos). */
const GIT_EXPAND_ALL_CONFIRM_THRESHOLD = 120;

export function GitPanel(props: { git: GitPanelModel }) {
  const git = props.git;

  if (!isElectron) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
        <p className="text-body/[1.4] font-medium text-foreground/85">Source control</p>
        <p className="max-w-[18rem] text-detail/[1.45] text-muted-foreground/72">
          Git status and diffs are available in the Multi desktop app.
        </p>
      </div>
    );
  }

  switch (git.view.kind) {
    case "idle":
    case "loading":
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3">
          <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
          <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
          <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
        </div>
      );
    case "error":
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <p className="text-body/[1.4] font-medium text-destructive/90">Git error</p>
          <p className="max-w-[20rem] text-detail/[1.45] text-muted-foreground/80">
            {git.view.message}
          </p>
        </div>
      );
    case "no-repo":
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
          <div className="space-y-1 px-4 py-3">
            <p className="text-body/[1.4] font-medium text-foreground/85">No repository</p>
            <p className="max-w-[18rem] text-detail/[1.45] text-muted-foreground/72">
              Initialize Git in this workspace to track changes and review diffs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void git
                .init()
                .catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : String(error)),
                );
            }}
            className="rounded-multi-control border border-multi-border/60 bg-multi-active/40 px-3 py-2 text-body/[1.2] font-medium text-foreground transition-colors hover:bg-multi-hover"
          >
            Init Git
          </button>
        </div>
      );
    case "clean":
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <p className="text-body/[1.4] font-medium text-foreground/85">Working tree clean</p>
          <p className="max-w-[18rem] text-detail/[1.45] text-muted-foreground/72">
            No staged or unstaged changes in this repository.
          </p>
        </div>
      );
    case "changed":
      return <GitPanelInner git={git} />;
  }
}

function GitPanelInner(props: { git: GitPanelModel }) {
  const git = props.git;
  const files = git.rows;
  const viewed = useGitViewed(git.cwd);
  const { open: gitRailOpen } = useSecondaryRail(git.cwd, "git");
  const [diffStyle, setDiffStyle] = useDiffStylePreference();
  const [pending, setPending] = useState<DiffRow | null>(null);
  const [discardAllPending, setDiscardAllPending] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const filesKey = useMemo(() => files.map((row) => row.id).join("\n"), [files]);
  const [selectedId, setSelectedId] = useState<string | null>(() => files[0]?.id ?? null);
  const [expandAllDialogOpen, setExpandAllDialogOpen] = useState(false);
  const gitRef = useRef(git);
  gitRef.current = git;

  const deckRootRef = useRef<HTMLDivElement>(null);
  const prefetchRef = useRef<(id: string) => void>((id) => {
    void id;
  });
  prefetchRef.current = (id: string) => {
    git.toggleExpand(id, true);
  };

  useEffect(() => {
    if (files.length === 0) {
      setSelectedId(null);
      return;
    }

    setSelectedId((previous) => {
      if (git.focusId && files.some((row) => row.id === git.focusId)) {
        return git.focusId;
      }

      return previous !== null && files.some((row) => row.id === previous)
        ? previous
        : files[0]!.id;
    });
  }, [filesKey, git.focusId, files]);

  useEffect(() => {
    if (!selectedId) return;
    gitRef.current.toggleExpand(selectedId, true);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const root = deckRootRef.current;
    if (!root) return;

    requestAnimationFrame(() => {
      const escaped = CSS.escape(selectedId);
      root.querySelector(`[data-diff-card-id="${escaped}"]`)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  }, [selectedId]);

  const confirmDiscard = useCallback(() => {
    if (!pending) return;
    void git
      .discard([pending.path])
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : String(error)),
      );
    setPending(null);
  }, [git, pending]);

  const confirmDiscardAll = useCallback(() => {
    const allPaths = files.map((f) => f.path);
    void git
      .discard(allPaths)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : String(error)),
      );
    setDiscardAllPending(false);
  }, [git, files]);

  const handleCommitAndPush = useCallback(() => {
    setCommitOpen(true);
  }, []);

  const handleSelectFile = useCallback((file: DiffRow) => {
    setSelectedId(file.id);
  }, []);

  const requestExpandAll = useCallback(() => {
    git.expandAll();
    setExpandAllDialogOpen(false);
  }, [git]);

  const onExpandAllClick = useCallback(() => {
    if (files.length > GIT_EXPAND_ALL_CONFIRM_THRESHOLD) {
      setExpandAllDialogOpen(true);
      return;
    }
    git.expandAll();
  }, [files.length, git]);

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <LocalBranchBar
          branch={git.branch}
          onCommitAndPush={handleCommitAndPush}
          onBranchCommit={() => setBranchOpen(true)}
          menuOpen={headerMenuOpen}
          onMenuOpen={setHeaderMenuOpen}
        />
        <ChangesHeader
          railOpen={gitRailOpen}
          onToggleRail={() => shellPanelsActions.toggleSecondaryRail(git.cwd, "git")}
          count={files.length}
          add={git.totalAdd}
          del={git.totalDel}
          onExpandAll={onExpandAllClick}
          onCollapseAll={git.collapseAll}
          diffStyle={diffStyle}
          onDiffStyle={setDiffStyle}
          onDiscardAll={() => setDiscardAllPending(true)}
          onRefresh={() => void git.refresh()}
        />
        <RightWorkbenchLayout
          cwd={git.cwd}
          tab="git"
          railHostClassName="multi-shell-git-rail"
          rail={
            <GitChangesFileTree
              rows={files}
              selectedId={selectedId}
              onSelect={handleSelectFile}
              className="no-drag min-h-0 min-h-36 flex-1 border-b-0 bg-transparent"
            />
          }
        >
          <div
            ref={deckRootRef}
            className="editor-panel-inner flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--glass-editor-surface-background,color-mix(in_srgb,var(--multi-bg-elevated)_76%,transparent))]"
          >
            {files.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-detail text-muted-foreground/60">
                No files to compare.
              </div>
            ) : (
              <Virtualizer
                className="git-stack-virtualizer h-full min-h-0 px-2 pb-3 pt-1"
                config={{
                  overscrollSize: 640,
                  intersectionObserverMargin: 900,
                }}
              >
                {files.map((file) => (
                  <GitDiffCard
                    key={file.id}
                    file={file}
                    selected={selectedId === file.id}
                    onSelect={() => setSelectedId(file.id)}
                    diff={git.diffsByPath.get(file.path) ?? null}
                    patch={git.patchesByPath.get(file.path) ?? null}
                    loading={git.diffLoadingByPath.has(file.path)}
                    error={git.diffErrorByPath.get(file.path) ?? null}
                    diffStyle={diffStyle}
                    viewed={viewed.isViewed(file.path)}
                    onToggleViewed={() => viewed.toggleViewed(file.path)}
                    onRevert={() => setPending(file)}
                    requestPrefetchForIdRef={prefetchRef}
                  />
                ))}
              </Virtualizer>
            )}
          </div>
        </RightWorkbenchLayout>
      </div>
      <DiscardDialog
        open={pending !== null}
        path={pending?.path ?? ""}
        onConfirm={confirmDiscard}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      />
      <DiscardAllDialog
        open={discardAllPending}
        count={files.length}
        onConfirm={confirmDiscardAll}
        onOpenChange={setDiscardAllPending}
      />
      <ExpandAllChangedFilesDialog
        open={expandAllDialogOpen}
        fileCount={files.length}
        threshold={GIT_EXPAND_ALL_CONFIRM_THRESHOLD}
        onConfirm={requestExpandAll}
        onOpenChange={setExpandAllDialogOpen}
      />
      <CommitDialog open={commitOpen} onOpenChange={setCommitOpen} onCommit={git.runCommit} />
      <BranchCommitDialog
        open={branchOpen}
        onOpenChange={setBranchOpen}
        onCommit={git.runBranchCommit}
      />
    </>
  );
}

function ExpandAllChangedFilesDialog(props: {
  open: boolean;
  fileCount: number;
  threshold: number;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPopup className="max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Expand all files?</DialogTitle>
          <DialogDescription>
            This loads patches for all {props.fileCount} changed files immediately. Above{" "}
            {props.threshold} files this can take noticeable time or memory on large repositories.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={props.onConfirm}>
            Expand All
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function LocalBranchBar(props: {
  branch: string | null;
  onCommitAndPush: () => void;
  onBranchCommit: () => void;
  menuOpen: boolean;
  onMenuOpen: (open: boolean) => void;
}) {
  const copyBranch = () => {
    if (!props.branch) return;
    void navigator.clipboard.writeText(props.branch);
    toast.success("Branch copied");
  };

  return (
    <WorkbenchChromeRow
      variant="panel"
      gap="loose"
      trailing={
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" size="sm" onClick={props.onCommitAndPush}>
            Commit & Push
          </Button>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => props.onMenuOpen(!props.menuOpen)}
              className="flex size-6 items-center justify-center rounded-multi-control text-muted-foreground/70 hover:bg-multi-hover hover:text-foreground"
              aria-label="More options"
            >
              <IconDotGrid1x3Horizontal className="size-3.5" />
            </button>
            {props.menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => props.onMenuOpen(false)} />
                <div className="absolute top-full right-0 z-50 mt-1 min-w-[160px] rounded-multi-card border border-multi-stroke bg-multi-bubble p-1 text-detail shadow-multi-popup backdrop-blur-xl">
                  <MenuItem
                    label="Create Branch & Commit..."
                    onClick={() => {
                      props.onBranchCommit();
                      props.onMenuOpen(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      }
    >
      <span className="shrink-0 text-detail font-medium text-muted-foreground/70">Local</span>
      <button
        type="button"
        onClick={copyBranch}
        className="flex min-w-0 items-center gap-1 overflow-hidden rounded px-1.5 py-0.5 text-detail font-medium text-foreground/90 transition-colors hover:bg-multi-hover hover:text-foreground"
        title="Copy branch name"
      >
        <IconBranch className="size-3 shrink-0 text-muted-foreground/60" />
        <span className="truncate font-mono">{props.branch ?? "detached"}</span>
      </button>
    </WorkbenchChromeRow>
  );
}

function ChangesHeader(props: {
  railOpen: boolean;
  onToggleRail: () => void;
  count: number;
  add: number;
  del: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  diffStyle: "unified" | "split";
  onDiffStyle: (next: "unified" | "split") => void;
  onDiscardAll: () => void;
  onRefresh: () => void;
}) {
  return (
    <WorkbenchChromeRow
      variant="panel"
      gap="relaxed"
      trailing={
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={props.onDiscardAll}
            className="min-w-0 max-w-[8.5rem] truncate whitespace-nowrap text-detail text-muted-foreground/60 transition-colors hover:text-foreground"
            title="Discard All Changes"
          >
            Discard All Changes
          </button>
          <DiffStyleToggle style={props.diffStyle} onChange={props.onDiffStyle} />
          <button
            type="button"
            onClick={props.onExpandAll}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:bg-multi-hover hover:text-foreground"
            aria-label="Expand all"
            title="Expand all"
          >
            <IconChevronBottom className="size-3" />
          </button>
          <button
            type="button"
            onClick={props.onCollapseAll}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:bg-multi-hover hover:text-foreground"
            aria-label="Collapse all"
            title="Collapse all"
          >
            <IconChevronRight className="size-3" />
          </button>
        </div>
      }
    >
      <button
        type="button"
        onClick={props.onToggleRail}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:bg-multi-hover hover:text-foreground",
          props.railOpen ? "bg-multi-hover text-foreground" : null,
        )}
        aria-label={props.railOpen ? "Hide changes list" : "Show changes list"}
        aria-pressed={props.railOpen}
        title={props.railOpen ? "Hide changes list" : "Show changes list"}
      >
        <List className="size-3.5 shrink-0" aria-hidden />
      </button>
      <span className="min-w-0 truncate text-detail tabular-nums text-foreground/80">
        {props.count} Uncommitted Change{props.count === 1 ? "" : "s"}
      </span>
      <div className="flex shrink-0 items-center gap-1 text-detail tabular-nums">
        {props.add > 0 && <span className="font-medium text-success-foreground">+{props.add}</span>}
        {props.del > 0 && (
          <span className="font-medium text-destructive-foreground">-{props.del}</span>
        )}
      </div>
    </WorkbenchChromeRow>
  );
}

function DiffStyleToggle(props: {
  style: "unified" | "split";
  onChange: (next: "unified" | "split") => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-multi-control border border-multi-border/45 bg-multi-hover/14 p-0.5">
      <button
        type="button"
        onClick={() => props.onChange("unified")}
        className={cn(
          "flex size-5 items-center justify-center rounded-multi-control transition-colors",
          props.style === "unified"
            ? "bg-multi-active/60 text-foreground"
            : "text-muted-foreground/70 hover:bg-multi-hover hover:text-foreground",
        )}
        aria-label="Unified diff"
        aria-pressed={props.style === "unified"}
      >
        <IconBarsThree className="size-3" />
      </button>
      <button
        type="button"
        onClick={() => props.onChange("split")}
        className={cn(
          "flex size-5 items-center justify-center rounded-multi-control transition-colors",
          props.style === "split"
            ? "bg-multi-active/60 text-foreground"
            : "text-muted-foreground/70 hover:bg-multi-hover hover:text-foreground",
        )}
        aria-label="Split diff"
        aria-pressed={props.style === "split"}
      >
        <IconSplit className="size-3" />
      </button>
    </div>
  );
}

function MenuItem(props: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex w-full items-center rounded-sm px-2 py-1 text-left text-foreground/82 transition-colors hover:bg-multi-active hover:text-foreground"
    >
      {props.label}
    </button>
  );
}

function DiscardAllDialog(props: {
  open: boolean;
  count: number;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPopup className="max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Discard all changes?</DialogTitle>
          <DialogDescription>
            Revert all {props.count} file{props.count === 1 ? "" : "s"} to the last committed
            version. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              props.onConfirm();
              props.onOpenChange(false);
            }}
          >
            Discard All
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function DiscardDialog(props: {
  open: boolean;
  path: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPopup className="max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Discard changes?</DialogTitle>
          <DialogDescription>
            Revert <span className="font-mono text-foreground/90">{props.path}</span> to the last
            committed version. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              props.onConfirm();
              props.onOpenChange(false);
            }}
          >
            Discard
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
