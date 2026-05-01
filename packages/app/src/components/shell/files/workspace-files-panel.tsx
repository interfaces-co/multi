"use client";

import type { EditorId, EnvironmentId } from "@multi/contracts";
import type { FileContents } from "@pierre/diffs";
import { File, type FileOptions } from "@pierre/diffs/react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBarsThree,
  IconFileBend,
  IconMagnifyingGlass,
} from "central-icons";
import { List } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { PIERRE_WORKBENCH_CODE_UNSAFE_CSS } from "~/lib/pierre-workbench-code-css";
import { projectReadFileQueryOptions } from "~/lib/project-react-query";
import { shellPanelsActions, useSecondaryRail } from "~/lib/shell-panels-store";
import { resolveDiffThemeName } from "~/lib/diff-rendering";
import { cn } from "~/lib/utils";
import { useTheme } from "~/hooks/use-theme";
import { WorkspaceFileTree } from "./workspace-file-tree";
import { RightWorkbenchLayout } from "../shell/right-workbench-layout";

type FilePaneMode = "browse" | "search";
type PreviewHistory = {
  readonly index: number;
  readonly paths: readonly string[];
};

const EMPTY_PREVIEW_HISTORY: PreviewHistory = {
  index: -1,
  paths: [],
};
const MAX_PREVIEW_HISTORY = 50;
function pushPreviewHistory(current: PreviewHistory, relativePath: string): PreviewHistory {
  if (current.paths[current.index] === relativePath) {
    return current;
  }
  const nextPaths = [...current.paths.slice(0, current.index + 1), relativePath];
  const trimmedPaths = nextPaths.slice(-MAX_PREVIEW_HISTORY);
  return {
    index: trimmedPaths.length - 1,
    paths: trimmedPaths,
  };
}

function ModeButton(props: {
  active?: boolean;
  label: string;
  onClick?: () => void;
  children: ReactNode;
  chrome?: "tool" | "sub" | "panel";
}) {
  const tier = props.chrome ?? "tool";
  return (
    <button
      type="button"
      aria-label={props.label}
      aria-pressed={props.active}
      title={props.label}
      onClick={props.onClick}
      className={cn(
        "outline-none focus-visible:outline-none ui-icon-button box-border shrink-0 items-center justify-center rounded-[5px] border-0 px-(--multi-workbench-chrome-icon-padding-x) shadow-none transition-colors [&_svg]:block",
        tier === "sub" &&
          "flex min-h-[var(--multi-workbench-sub-chrome-row-height)] max-h-[var(--multi-workbench-sub-chrome-row-height)] text-multi-fg-secondary hover:bg-multi-bg-quaternary hover:text-multi-fg-primary",
        tier === "panel" &&
          "flex min-h-[calc(var(--multi-workbench-panel-title-row-height,29px)-6px)] max-h-[calc(var(--multi-workbench-panel-title-row-height,29px)-4px)] text-multi-fg-secondary hover:bg-multi-bg-quaternary hover:text-multi-fg-primary",
        tier === "tool" &&
          "flex h-(--multi-workbench-chrome-row-height) text-multi-fg-secondary hover:bg-multi-bg-quaternary hover:text-multi-fg-primary",
        props.active && "bg-multi-bg-tertiary text-multi-fg-primary",
      )}
    >
      {props.children}
    </button>
  );
}

function NavButton(props: {
  disabled: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
  chrome?: "tool" | "sub" | "panel";
}) {
  const tier = props.chrome ?? "tool";
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        "outline-none focus-visible:outline-none ui-icon-button box-border shrink-0 items-center justify-center rounded-[5px] border-0 px-(--multi-workbench-chrome-icon-padding-x) shadow-none transition-colors disabled:text-multi-fg-quaternary/45 disabled:hover:bg-transparent disabled:hover:text-multi-fg-quaternary/45 [&_svg]:block",
        tier === "sub" &&
          "flex min-h-[var(--multi-workbench-sub-chrome-row-height)] max-h-[var(--multi-workbench-sub-chrome-row-height)] text-multi-fg-secondary hover:bg-multi-bg-quaternary hover:text-multi-fg-primary",
        tier === "panel" &&
          "flex min-h-[calc(var(--multi-workbench-panel-title-row-height,29px)-6px)] max-h-[calc(var(--multi-workbench-panel-title-row-height,29px)-4px)] text-multi-fg-secondary hover:bg-multi-bg-quaternary hover:text-multi-fg-primary",
        tier === "tool" &&
          "flex h-(--multi-workbench-chrome-row-height) text-multi-fg-secondary hover:bg-multi-bg-quaternary hover:text-multi-fg-primary",
      )}
    >
      {props.children}
    </button>
  );
}

function EmptyFilePreview(props: { onOpenFile: () => void }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center px-4 py-8 text-center">
      <button
        type="button"
        onClick={props.onOpenFile}
        className="flex h-7 items-center gap-1.5 rounded-[5px] border border-multi-stroke-tertiary bg-multi-bg-quinary px-2.5 text-[12px]/[16px] font-medium text-multi-fg-primary hover:bg-multi-bg-quaternary"
      >
        <IconFileBend className="size-3.5" />
        Open File
      </button>
    </div>
  );
}

function SourcePreview(props: {
  cwd: string | null;
  environmentId: EnvironmentId | null;
  selectedPath: string | null;
  wordWrap: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const fileQuery = useQuery(
    projectReadFileQueryOptions({
      cwd: props.cwd,
      environmentId: props.environmentId,
      relativePath: props.selectedPath,
      enabled: Boolean(props.cwd && props.environmentId && props.selectedPath),
    }),
  );
  const fileOptions = useMemo<FileOptions<undefined>>(
    () => ({
      disableFileHeader: true,
      enableLineSelection: true,
      overflow: props.wordWrap ? "wrap" : "scroll",
      preferredHighlighter: "shiki-js",
      theme: resolveDiffThemeName(resolvedTheme),
      themeType: resolvedTheme,
      unsafeCSS: PIERRE_WORKBENCH_CODE_UNSAFE_CSS,
    }),
    [props.wordWrap, resolvedTheme],
  );
  const fileContents = useMemo<FileContents | undefined>(() => {
    if (!fileQuery.data) {
      return undefined;
    }
    return {
      name: fileQuery.data.relativePath,
      contents: fileQuery.data.contents,
      lang: fileQuery.data.syntax.languageId as NonNullable<FileContents["lang"]>,
      cacheKey: `${fileQuery.data.relativePath}:${fileQuery.data.sizeBytes}:${fileQuery.data.contents.length}`,
    };
  }, [fileQuery.data]);

  if (!props.selectedPath) {
    return <EmptyFilePreview onOpenFile={() => undefined} />;
  }

  if (fileQuery.isPending) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="space-y-2 bg-background p-3">
          <div className="h-3 w-11/12 animate-pulse rounded bg-muted-foreground/10" />
          <div className="h-3 w-7/12 animate-pulse rounded bg-muted-foreground/10" />
          <div className="h-3 w-10/12 animate-pulse rounded bg-muted-foreground/10" />
        </div>
      </div>
    );
  }

  if (fileQuery.isError || !fileQuery.data) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-4 py-8 text-center">
        <div className="text-[12px]/[16px] font-medium text-destructive/85">
          Unable to preview file
        </div>
        <div className="max-w-72 text-[11px]/[14px] text-muted-foreground/55">
          {fileQuery.error instanceof Error
            ? fileQuery.error.message
            : "The file could not be read."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {fileQuery.data.truncated ? (
        <div className="shrink-0 border-b border-multi-border/30 px-3 py-1.5 text-[11px]/[14px] text-muted-foreground/60">
          Showing the first 1 MB of this file.
        </div>
      ) : null}
      {fileContents ? (
        <div className="workspace-file-preview min-h-0 flex-1 overflow-hidden bg-background text-[12px]/[18px] text-foreground">
          <File
            key={`${fileQuery.data.relativePath}:${props.wordWrap ? "wrap" : "scroll"}:${resolvedTheme}`}
            file={fileContents}
            options={fileOptions}
            className="workspace-file-preview-code min-h-0 h-full overflow-auto"
          />
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceFilesPanel(props: {
  cwd: string | null;
  environmentId: EnvironmentId | null;
  availableEditors: readonly EditorId[];
}) {
  const [mode, setMode] = useState<FilePaneMode>("browse");
  const [history, setHistory] = useState<PreviewHistory>(EMPTY_PREVIEW_HISTORY);
  const { open: filesRailOpen } = useSecondaryRail(props.cwd, "files");
  const selectedPath = history.index >= 0 ? (history.paths[history.index] ?? null) : null;
  const canGoBack = history.index > 0;
  const canGoForward = history.index >= 0 && history.index < history.paths.length - 1;

  const openPreviewPath = useCallback((relativePath: string) => {
    setHistory((current) => pushPreviewHistory(current, relativePath));
  }, []);

  const navigatePreviewHistory = useCallback((delta: -1 | 1) => {
    setHistory((current) => {
      const nextIndex = current.index + delta;
      if (nextIndex < 0 || nextIndex >= current.paths.length) {
        return current;
      }
      return {
        ...current,
        index: nextIndex,
      };
    });
  }, []);

  useEffect(() => {
    setHistory(EMPTY_PREVIEW_HISTORY);
  }, [props.cwd, props.environmentId]);

  const tree = (
    <WorkspaceFileTree
      cwd={props.cwd}
      environmentId={props.environmentId}
      availableEditors={props.availableEditors}
      onOpenFile={openPreviewPath}
      searchOpen={mode === "search"}
      selectedPath={selectedPath}
      className="min-h-0 min-h-36 flex-1 border-b-0 bg-[color-mix(in_srgb,var(--multi-bg-elevated)_78%,transparent)]"
    />
  );

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      <div className="multi-workbench-panel-title-row gap-[var(--multi-workbench-chrome-action-gap)]">
        <button
          type="button"
          className={cn(
            "no-drag flex shrink-0 items-center justify-center rounded-[5px] border-0 px-(--multi-workbench-chrome-icon-padding-x) transition-colors focus-visible:outline-none",
            "min-h-[calc(var(--multi-workbench-panel-title-row-height,29px)-4px)]",
            filesRailOpen
              ? "bg-multi-bg-tertiary text-multi-icon-primary"
              : "bg-transparent text-multi-icon-secondary hover:bg-multi-bg-quaternary hover:text-multi-icon-primary",
          )}
          aria-label={filesRailOpen ? "Hide file tree" : "Show file tree"}
          aria-pressed={filesRailOpen}
          title={filesRailOpen ? "Hide file tree" : "Show file tree"}
          onClick={() => shellPanelsActions.toggleSecondaryRail(props.cwd, "files")}
        >
          <List className="size-[15px]" aria-hidden />
        </button>
        <ModeButton
          active={mode === "browse"}
          chrome="panel"
          label="Browse Files"
          onClick={() => setMode("browse")}
        >
          <IconBarsThree className="size-3.5" />
        </ModeButton>
        <ModeButton
          active={mode === "search"}
          chrome="panel"
          label="Search Files"
          onClick={() => setMode("search")}
        >
          <IconMagnifyingGlass className="size-3.5" />
        </ModeButton>
        <NavButton
          disabled={!canGoBack}
          chrome="panel"
          label="Back"
          onClick={() => navigatePreviewHistory(-1)}
        >
          <IconArrowLeft className="size-3.5" />
        </NavButton>
        <NavButton
          chrome="panel"
          disabled={!canGoForward}
          label="Forward"
          onClick={() => navigatePreviewHistory(1)}
        >
          <IconArrowRight className="size-3.5" />
        </NavButton>
        <div className="min-w-0 flex-1" />
      </div>

      <RightWorkbenchLayout cwd={props.cwd} tab="files" rail={tree}>
        <div className="editor-panel-inner flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--glass-editor-surface-background,color-mix(in_srgb,var(--multi-bg-elevated)_76%,transparent))]">
          <div className="flex min-h-0 flex-1 flex-col">
            {selectedPath ? (
              <SourcePreview
                cwd={props.cwd}
                environmentId={props.environmentId}
                selectedPath={selectedPath}
                wordWrap
              />
            ) : (
              <EmptyFilePreview onOpenFile={() => setMode("search")} />
            )}
          </div>
        </div>
      </RightWorkbenchLayout>
    </div>
  );
}
