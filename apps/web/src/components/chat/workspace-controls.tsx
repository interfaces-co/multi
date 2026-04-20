import type { EnvironmentId, GitBranch } from "@multi/contracts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState, type ComponentProps } from "react";

import { gitBranchSearchInfiniteQueryOptions } from "~/lib/git-react-query";
import {
  dedupeRemoteBranchesWithLocalMatches,
  resolveBranchToolbarValue,
  resolveCurrentWorkspaceLabel,
  resolveEnvModeLabel,
  resolveLockedWorkspaceLabel,
  shouldIncludeBranchPickerItem,
  type EnvMode,
} from "~/lib/branch-toolbar-logic";
import { cn } from "~/lib/utils";
import { parsePullRequestReference } from "~/pull-request-reference";
import { Input } from "../ui/input";

export function WorkspaceControls(props: {
  environmentId: EnvironmentId;
  activeProjectCwd: string | null;
  activeWorktreePath: string | null;
  currentGitBranch: string | null;
  activeThreadBranch: string | null;
  envMode: EnvMode;
  canChangeEnvMode: boolean;
  onEnvModeChange: (mode: EnvMode) => void;
  onBranchSelect: (branch: GitBranch) => void;
  onOpenPullRequestDialog: (reference: string) => void;
}) {
  const [envMenuOpen, setEnvMenuOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [branchQuery, setBranchQuery] = useState("");

  const branchSearch = useInfiniteQuery(
    gitBranchSearchInfiniteQueryOptions({
      environmentId: props.environmentId,
      cwd: props.activeProjectCwd,
      query: branchQuery,
      enabled: branchMenuOpen,
    }),
  );

  const branches = useMemo(() => {
    const nextBranches = branchSearch.data?.pages.flatMap((page) => page.branches) ?? [];
    return [...dedupeRemoteBranchesWithLocalMatches(nextBranches)];
  }, [branchSearch.data]);

  const branchToolbarValue = resolveBranchToolbarValue({
    envMode: props.envMode,
    activeWorktreePath: props.activeWorktreePath,
    activeThreadBranch: props.activeThreadBranch,
    currentGitBranch: props.currentGitBranch,
  });
  const branchButtonLabel =
    props.envMode === "worktree" && !props.activeWorktreePath
      ? `From ${branchToolbarValue ?? "Select branch"}`
      : (branchToolbarValue ?? "Select branch");
  const workspaceButtonLabel = props.canChangeEnvMode
    ? props.activeWorktreePath
      ? resolveCurrentWorkspaceLabel(props.activeWorktreePath)
      : resolveEnvModeLabel(props.envMode)
    : resolveLockedWorkspaceLabel(props.activeWorktreePath);
  const parsedPullRequestReference = parsePullRequestReference(branchQuery);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <ToolbarButton
          type="button"
          onClick={() => props.canChangeEnvMode && setEnvMenuOpen((open) => !open)}
          disabled={!props.canChangeEnvMode}
        >
          {workspaceButtonLabel}
        </ToolbarButton>
        {envMenuOpen ? (
          <div className="absolute top-full left-0 z-20 mt-2 min-w-44 rounded-xl border border-border bg-popover p-1 shadow-xl">
            <MenuButton
              onClick={() => {
                props.onEnvModeChange("local");
                setEnvMenuOpen(false);
              }}
            >
              {resolveEnvModeLabel("local")}
            </MenuButton>
            <MenuButton
              onClick={() => {
                props.onEnvModeChange("worktree");
                setEnvMenuOpen(false);
              }}
            >
              {resolveEnvModeLabel("worktree")}
            </MenuButton>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <ToolbarButton
          type="button"
          onClick={() => setBranchMenuOpen((open) => !open)}
          disabled={!props.activeProjectCwd}
        >
          {branchButtonLabel}
        </ToolbarButton>
        {branchMenuOpen ? (
          <div className="absolute top-full left-0 z-20 mt-2 flex w-[min(24rem,calc(100vw-2rem))] max-w-sm flex-col rounded-xl border border-border bg-popover p-2 shadow-xl">
            <Input
              value={branchQuery}
              onChange={(event) => setBranchQuery(event.currentTarget.value)}
              placeholder="Search branches..."
              className="mb-2"
            />
            <div className="max-h-72 overflow-y-auto">
              {parsedPullRequestReference ? (
                <MenuButton
                  onClick={() => {
                    props.onOpenPullRequestDialog(parsedPullRequestReference);
                    setBranchMenuOpen(false);
                    setBranchQuery("");
                  }}
                >
                  <span>Checkout Pull Request</span>
                </MenuButton>
              ) : null}
              {branches.map((branch) => {
                if (
                  !shouldIncludeBranchPickerItem({
                    itemValue: branch.name,
                    normalizedQuery: branchQuery.trim().toLowerCase(),
                    createBranchItemValue: null,
                    checkoutPullRequestItemValue: parsedPullRequestReference,
                  })
                ) {
                  return null;
                }
                return (
                  <MenuButton
                    key={branch.name}
                    onClick={() => {
                      props.onBranchSelect(branch);
                      setBranchMenuOpen(false);
                      setBranchQuery("");
                    }}
                  >
                    <span>{branch.name}</span>
                  </MenuButton>
                );
              })}
              {branchSearch.isPending ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Loading branches...</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarButton(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60",
        props.className,
      )}
    />
  );
}

function MenuButton(props: ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        props.className,
      )}
    />
  );
}
