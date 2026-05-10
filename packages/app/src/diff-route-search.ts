import { TurnId } from "@multi/contracts";

import type { WorkbenchTab } from "~/lib/shell-panels-store";

export interface DiffRouteSearch {
  diff?: "1" | undefined;
  diffTurnId?: TurnId | undefined;
  diffFilePath?: string | undefined;
}

export type ChatShellSearch = DiffRouteSearch & {
  workbench?: WorkbenchTab;
};

function parseWorkbenchSearchParam(search: Record<string, unknown>): { workbench?: WorkbenchTab } {
  const w = search.workbench;
  if (w === undefined || w === null || w === "") {
    return {};
  }
  if (w === "files" || w === "git" || w === "terminal") {
    return { workbench: w };
  }
  return {};
}

export function parseChatShellSearch(search: Record<string, unknown>): ChatShellSearch {
  return {
    ...parseDiffRouteSearch(search),
    ...parseWorkbenchSearchParam(search),
  };
}

function isDiffOpenValue(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

function normalizeSearchString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function stripDiffSearchParams<T extends Record<string, unknown>>(
  params: T,
): Omit<T, "diff" | "diffTurnId" | "diffFilePath"> & {
  diff?: undefined;
  diffTurnId?: undefined;
  diffFilePath?: undefined;
} {
  const { diff: _diff, diffTurnId: _diffTurnId, diffFilePath: _diffFilePath, ...rest } = params;
  return {
    ...rest,
    diff: undefined,
    diffTurnId: undefined,
    diffFilePath: undefined,
  } as Omit<T, "diff" | "diffTurnId" | "diffFilePath"> & {
    diff?: undefined;
    diffTurnId?: undefined;
    diffFilePath?: undefined;
  };
}

export function parseDiffRouteSearch(search: Record<string, unknown>): DiffRouteSearch {
  const diff = isDiffOpenValue(search.diff) ? "1" : undefined;
  const diffTurnIdRaw = diff ? normalizeSearchString(search.diffTurnId) : undefined;
  const diffTurnId = diffTurnIdRaw ? TurnId.make(diffTurnIdRaw) : undefined;
  const diffFilePath = diff && diffTurnId ? normalizeSearchString(search.diffFilePath) : undefined;

  return {
    ...(diff ? { diff } : {}),
    ...(diffTurnId ? { diffTurnId } : {}),
    ...(diffFilePath ? { diffFilePath } : {}),
  };
}
