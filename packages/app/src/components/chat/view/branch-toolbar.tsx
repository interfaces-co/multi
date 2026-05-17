import type { EnvironmentId, GitBranch } from "@multi/contracts";
import { Button } from "@multi/ui/button";
import { Input } from "@multi/ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "@multi/ui/popover";
import { useInfiniteQuery } from "@tanstack/react-query";
import { IconChevronRightMedium } from "central-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  dedupeRemoteBranchesWithLocalMatches,
  resolveBranchToolbarValue,
  resolveEnvModeLabel,
  shouldIncludeBranchPickerItem,
  type EnvMode,
} from "../../../lib/branch-toolbar-logic";
import { gitBranchSearchInfiniteQueryOptions } from "../../../lib/git-react-query";
import { cn } from "../../../lib/utils";
import { parsePullRequestReference } from "../../../pull-request-reference";

interface BranchToolbarProps {
  environmentId: EnvironmentId;
  cwd: string | null;
  envMode: EnvMode;
  activeWorktreePath: string | null;
  activeThreadBranch: string | null;
  currentGitBranch: string | null;
  isGitRepo: boolean;
  canChangeEnvMode: boolean;
  disabled: boolean;
  onEnvModeChange: (mode: EnvMode, branch: string | null) => void;
  onBranchSelect: (branch: GitBranch) => Promise<void> | void;
  onCheckoutPullRequest: (reference: string) => void;
}

export function BranchToolbar(props: BranchToolbarProps) {
  const [envModeOpen, setEnvModeOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchQuery, setBranchQuery] = useState("");
  const branchInputRef = useRef<HTMLInputElement | null>(null);

  const branchesQuery = useInfiniteQuery(
    gitBranchSearchInfiniteQueryOptions({
      environmentId: props.environmentId,
      cwd: props.cwd,
      query: branchQuery,
      enabled: props.isGitRepo && props.cwd !== null,
    }),
  );
  const branches = useMemo(
    () =>
      dedupeRemoteBranchesWithLocalMatches(
        (branchesQuery.data?.pages ?? []).flatMap((page) => page.branches),
      ),
    [branchesQuery.data],
  );
  const currentBranch =
    props.currentGitBranch ??
    branches.find((branch) => branch.current)?.name ??
    branches.find((branch) => branch.isDefault)?.name ??
    null;
  const selectedBranch = resolveBranchToolbarValue({
    envMode: props.envMode,
    activeWorktreePath: props.activeWorktreePath,
    activeThreadBranch: props.activeThreadBranch,
    currentGitBranch: currentBranch,
  });
  const branchButtonLabel = selectedBranch
    ? props.envMode === "worktree" && props.activeWorktreePath === null
      ? `From ${selectedBranch}`
      : selectedBranch
    : "Branch";
  const normalizedBranchQuery = branchQuery.trim();
  const parsedPullRequestReference = parsePullRequestReference(normalizedBranchQuery);
  const checkoutPullRequestItemValue = parsedPullRequestReference
    ? `__checkout_pull_request__:${parsedPullRequestReference}`
    : null;
  const filteredBranches = useMemo(
    () =>
      branches.filter((branch) =>
        shouldIncludeBranchPickerItem({
          itemValue: branch.name,
          normalizedQuery: normalizedBranchQuery.toLowerCase(),
          createBranchItemValue: null,
          checkoutPullRequestItemValue,
        }),
      ),
    [branches, checkoutPullRequestItemValue, normalizedBranchQuery],
  );
  const showPullRequestItem = checkoutPullRequestItemValue
    ? shouldIncludeBranchPickerItem({
        itemValue: checkoutPullRequestItemValue,
        normalizedQuery: normalizedBranchQuery.toLowerCase(),
        createBranchItemValue: null,
        checkoutPullRequestItemValue,
      })
    : false;

  useEffect(() => {
    if (!branchOpen) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      branchInputRef.current?.focus();
      branchInputRef.current?.select();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [branchOpen]);

  const selectEnvMode = useCallback(
    (mode: EnvMode) => {
      props.onEnvModeChange(mode, mode === "worktree" ? selectedBranch : null);
      setEnvModeOpen(false);
    },
    [props, selectedBranch],
  );

  const selectBranch = useCallback(
    (branch: GitBranch) => {
      setBranchOpen(false);
      void props.onBranchSelect(branch);
    },
    [props],
  );

  if (!props.isGitRepo || !props.cwd) {
    return null;
  }

  return (
    <div className="mb-2 flex w-full items-center justify-start gap-1.5">
      <Popover open={envModeOpen} onOpenChange={setEnvModeOpen}>
        <PopoverTrigger
          render={
            <Button
              size="sm"
              variant="outline"
              disabled={props.disabled || !props.canChangeEnvMode}
              className="gap-1.5"
            />
          }
        >
          <span>{resolveEnvModeLabel(props.envMode)}</span>
          {props.canChangeEnvMode ? (
            <IconChevronRightMedium className="size-3 rotate-90 opacity-70" aria-hidden />
          ) : null}
        </PopoverTrigger>
        <PopoverPopup align="start" side="top" sideOffset={6} instant className="w-44 p-1">
          <button
            type="button"
            className={envModeMenuItemClass(props.envMode === "local")}
            onClick={() => selectEnvMode("local")}
          >
            Current checkout
          </button>
          <button
            type="button"
            className={envModeMenuItemClass(props.envMode === "worktree")}
            onClick={() => selectEnvMode("worktree")}
          >
            New worktree
          </button>
        </PopoverPopup>
      </Popover>

      <Popover
        open={branchOpen}
        onOpenChange={(open) => {
          setBranchOpen(open);
          if (open) {
            setBranchQuery("");
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              size="sm"
              variant="outline"
              disabled={props.disabled || branchesQuery.isError}
              className="max-w-64 gap-1.5"
            />
          }
        >
          <span className="min-w-0 truncate">{branchButtonLabel}</span>
          <IconChevronRightMedium className="size-3 rotate-90 opacity-70" aria-hidden />
        </PopoverTrigger>
        <PopoverPopup
          align="start"
          side="top"
          sideOffset={6}
          instant
          className="w-72 overflow-hidden p-0"
        >
          <div data-slot="combobox-popup" className="flex max-h-96 min-h-0 flex-col">
            <div className="border-multi-stroke-tertiary border-b p-1.5">
              <Input
                ref={branchInputRef}
                placeholder="Search branches..."
                size="sm"
                value={branchQuery}
                onChange={(event) => setBranchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setBranchOpen(false);
                  }
                }}
              />
            </div>
            <div className="min-h-0 overflow-y-auto p-1">
              {showPullRequestItem && parsedPullRequestReference ? (
                <button
                  type="button"
                  className={branchItemClass(false)}
                  onClick={() => {
                    setBranchOpen(false);
                    props.onCheckoutPullRequest(parsedPullRequestReference);
                  }}
                >
                  <span>Checkout Pull Request</span>
                </button>
              ) : null}
              {filteredBranches.map((branch) => (
                <button
                  type="button"
                  key={`${branch.name}:${branch.worktreePath ?? ""}`}
                  className={branchItemClass(branch.name === selectedBranch)}
                  onClick={() => selectBranch(branch)}
                >
                  <span className="min-w-0 truncate">{branch.name}</span>
                </button>
              ))}
              {filteredBranches.length === 0 && !showPullRequestItem ? (
                <div className="px-2 py-4 text-center text-detail text-multi-fg-tertiary">
                  No branches found
                </div>
              ) : null}
            </div>
          </div>
        </PopoverPopup>
      </Popover>
    </div>
  );
}

function envModeMenuItemClass(selected: boolean): string {
  return cn(
    "flex h-7 w-full items-center rounded-multi-control px-2 text-left text-body outline-none",
    selected
      ? "bg-multi-bg-tertiary text-multi-fg-primary"
      : "text-multi-fg-secondary hover:bg-multi-bg-quaternary hover:text-multi-fg-primary",
  );
}

function branchItemClass(selected: boolean): string {
  return cn(
    "flex h-7 w-full items-center rounded-multi-control px-2 text-left text-body outline-none",
    selected
      ? "bg-multi-bg-tertiary text-multi-fg-primary"
      : "text-multi-fg-secondary hover:bg-multi-bg-quaternary hover:text-multi-fg-primary",
  );
}
