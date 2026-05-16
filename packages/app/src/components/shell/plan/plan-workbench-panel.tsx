"use client";

import type { EnvironmentId } from "@multi/contracts";
import type { TimestampFormat } from "@multi/contracts/settings";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@multi/ui/menu";
import {
  IconCheckmark1,
  IconArrowUp,
  IconClipboard,
  IconDotGrid1x3Horizontal,
  IconFileDownload,
  IconLoader,
} from "central-icons";
import { memo, useCallback, useState } from "react";

import { toastManager } from "~/app/toast";
import ChatMarkdown from "~/components/chat/markdown/chat-markdown";
import { readEnvironmentApi } from "~/environment-api";
import { useCopyToClipboard } from "~/hooks/use-copy-to-clipboard";
import { cn } from "~/lib/utils";
import {
  buildProposedPlanMarkdownFilename,
  downloadPlanAsTextFile,
  normalizePlanMarkdownForExport,
  proposedPlanTitle,
  stripDisplayedPlanMarkdown,
} from "~/proposed-plan";
import type { ActivePlanState, LatestProposedPlanState } from "~/session-logic";
import { formatTimestamp } from "~/timestamp-format";
import { WorkbenchChromeRow } from "../shell/workbench-chrome-row";
import { WorkbenchIconButton, WorkbenchTextButton } from "../shell/workbench-icon-button";

function stepStatusIcon(status: ActivePlanState["steps"][number]["status"]): React.ReactNode {
  if (status === "completed") {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
        <IconCheckmark1 className="size-3" aria-hidden />
      </span>
    );
  }
  if (status === "inProgress") {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-400">
        <IconLoader className="size-3 animate-spin" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-multi-stroke-tertiary bg-multi-bg-quinary">
      <span className="size-1.5 rounded-full bg-multi-fg-quaternary" />
    </span>
  );
}

export interface PlanWorkbenchPanelProps {
  activePlan: ActivePlanState | null;
  activeProposedPlan: LatestProposedPlanState | null;
  label: "Plan" | "Tasks";
  environmentId: EnvironmentId;
  markdownCwd: string | undefined;
  projectRoot: string | undefined;
  timestampFormat: TimestampFormat;
  canImplementPlan?: boolean | undefined;
  isImplementingPlan?: boolean | undefined;
  onImplementPlan?: (() => void) | undefined;
  onImplementPlanInNewThread?: (() => void) | undefined;
}

export const PlanWorkbenchPanel = memo(function PlanWorkbenchPanel({
  activePlan,
  activeProposedPlan,
  label,
  environmentId,
  markdownCwd,
  projectRoot,
  timestampFormat,
  canImplementPlan = false,
  isImplementingPlan = false,
  onImplementPlan,
  onImplementPlanInNewThread,
}: PlanWorkbenchPanelProps) {
  const [isSavingToProject, setIsSavingToProject] = useState(false);
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const planMarkdown = activeProposedPlan?.planMarkdown ?? null;
  const displayedPlanMarkdown = planMarkdown ? stripDisplayedPlanMarkdown(planMarkdown) : null;
  const planTitle = planMarkdown ? proposedPlanTitle(planMarkdown) : null;
  const timestamp = activePlan?.createdAt ?? activeProposedPlan?.updatedAt ?? null;

  const handleCopyPlan = useCallback(() => {
    if (!planMarkdown) return;
    copyToClipboard(planMarkdown);
  }, [copyToClipboard, planMarkdown]);

  const handleDownload = useCallback(() => {
    if (!planMarkdown) return;
    const filename = buildProposedPlanMarkdownFilename(planMarkdown);
    downloadPlanAsTextFile(filename, normalizePlanMarkdownForExport(planMarkdown));
  }, [planMarkdown]);

  const handleSaveToProject = useCallback(() => {
    const api = readEnvironmentApi(environmentId);
    if (!api || !projectRoot || !planMarkdown) return;

    const filename = buildProposedPlanMarkdownFilename(planMarkdown);
    setIsSavingToProject(true);
    void api.projects
      .writeFile({
        cwd: projectRoot,
        relativePath: filename,
        contents: normalizePlanMarkdownForExport(planMarkdown),
      })
      .then((result) => {
        toastManager.add({
          type: "success",
          title: "Plan saved",
          description: result.relativePath,
        });
      })
      .catch((error) => {
        toastManager.add({
          type: "error",
          title: "Could not save plan",
          description: error instanceof Error ? error.message : "An error occurred.",
        });
      })
      .finally(() => setIsSavingToProject(false));
  }, [environmentId, planMarkdown, projectRoot]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <WorkbenchChromeRow
        variant="panel"
        gap="relaxed"
        trailing={
          planMarkdown ? (
            <div className="flex shrink-0 items-center gap-(--multi-workbench-chrome-action-gap)">
              {onImplementPlan ? (
                <WorkbenchTextButton
                  onClick={onImplementPlan}
                  title="Implement plan"
                  tone="primary"
                  disabled={!canImplementPlan || isImplementingPlan}
                >
                  {isImplementingPlan ? (
                    <IconLoader className="size-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <IconArrowUp className="size-3.5 shrink-0" aria-hidden />
                  )}
                  <span>{isImplementingPlan ? "Starting" : "Implement"}</span>
                </WorkbenchTextButton>
              ) : null}
              <WorkbenchTextButton onClick={handleCopyPlan} title="Copy plan markdown">
                <IconClipboard className="size-3.5 shrink-0" aria-hidden />
                <span>{isCopied ? "Copied" : "Copy"}</span>
              </WorkbenchTextButton>
              <WorkbenchIconButton
                aria-label="Download plan markdown"
                chrome="panel"
                onClick={handleDownload}
              >
                <IconFileDownload className="size-3.5" aria-hidden />
              </WorkbenchIconButton>
              <Menu>
                <MenuTrigger
                  type="button"
                  aria-label="Plan actions"
                  className="no-drag ui-icon-button box-border flex h-(--multi-workbench-action-size) min-h-(--multi-workbench-action-size) min-w-(--multi-workbench-action-size) shrink-0 items-center justify-center rounded-multi-control border-0 bg-transparent px-(--multi-workbench-chrome-icon-padding-x) text-multi-icon-secondary shadow-none outline-hidden transition-colors hover:bg-multi-bg-quaternary hover:text-multi-icon-primary focus-visible:ring-1 focus-visible:ring-multi-stroke-focused focus-visible:ring-inset"
                >
                  <IconDotGrid1x3Horizontal className="size-3.5" aria-hidden />
                </MenuTrigger>
                <MenuPopup align="end" variant="workbench">
                  {onImplementPlanInNewThread ? (
                    <MenuItem
                      variant="workbench"
                      onClick={onImplementPlanInNewThread}
                      disabled={!canImplementPlan || isImplementingPlan}
                    >
                      Implement in a new thread
                    </MenuItem>
                  ) : null}
                  <MenuItem variant="workbench" onClick={handleCopyPlan}>
                    {isCopied ? "Copied" : "Copy to clipboard"}
                  </MenuItem>
                  <MenuItem variant="workbench" onClick={handleDownload}>
                    Download as markdown
                  </MenuItem>
                  <MenuItem
                    variant="workbench"
                    onClick={handleSaveToProject}
                    disabled={!projectRoot || isSavingToProject}
                  >
                    {isSavingToProject ? "Saving to project" : "Save to project"}
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </div>
          ) : null
        }
      >
        <span className="inline-flex h-(--multi-workbench-action-size) shrink-0 items-center rounded-multi-control bg-multi-bg-tertiary px-1.5 text-caption font-semibold text-multi-fg-secondary uppercase">
          {label}
        </span>
        {timestamp ? (
          <span className="min-w-0 truncate text-detail text-multi-fg-tertiary">
            {formatTimestamp(timestamp, timestampFormat)}
          </span>
        ) : null}
      </WorkbenchChromeRow>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
        {activePlan ? (
          <section className="grid gap-3">
            {activePlan.explanation ? (
              <p className="text-body text-multi-fg-secondary">{activePlan.explanation}</p>
            ) : null}
            <div className="grid gap-1.5">
              <h2 className="text-caption font-semibold tracking-wide text-multi-fg-tertiary uppercase">
                Tasks
              </h2>
              <div className="grid gap-1">
                {activePlan.steps.map((step, index) => (
                  <div
                    key={`${index}:${step.step}`}
                    className={cn(
                      "flex min-w-0 items-start gap-2.5 rounded-multi-control px-2.5 py-2 transition-colors duration-150 ease-out",
                      step.status === "inProgress" && "bg-blue-500/5",
                      step.status === "completed" && "bg-emerald-500/5",
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{stepStatusIcon(step.status)}</div>
                    <p
                      className={cn(
                        "min-w-0 text-body",
                        step.status === "completed"
                          ? "text-multi-fg-tertiary line-through decoration-multi-fg-quaternary"
                          : step.status === "inProgress"
                            ? "text-multi-fg-primary"
                            : "text-multi-fg-secondary",
                      )}
                    >
                      {step.step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {planMarkdown ? (
          <section className="grid gap-3 border-t border-multi-stroke-tertiary pt-4 first:border-t-0 first:pt-0">
            <h2 className="text-caption font-semibold tracking-wide text-multi-fg-tertiary uppercase">
              {planTitle ?? "Proposed Plan"}
            </h2>
            <div className="min-w-0 text-body text-multi-fg-primary">
              <ChatMarkdown
                text={displayedPlanMarkdown ?? ""}
                cwd={markdownCwd}
                isStreaming={false}
              />
            </div>
          </section>
        ) : null}

        {!activePlan && !planMarkdown ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8 text-center">
            <p className="text-body text-multi-fg-tertiary">No plan data available.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
});
