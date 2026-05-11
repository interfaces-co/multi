import type { EnvironmentId } from "@multi/contracts";
import { queryOptions } from "@tanstack/react-query";

import type { GitFileState } from "~/lib/ui-session-types";
import { readNativeGitApi } from "~/lib/native-git-api";

export interface GitPatchData {
  kind: "patch" | "untracked" | "rename_only" | "empty";
  patch: string | null;
  message: string | null;
}

const GIT_PATCH_CACHE_GC_TIME_MS = 2 * 60 * 1000;

export const gitQueryKeys = {
  patch: (
    environmentId: EnvironmentId | null,
    cwd: string,
    path: string,
    state?: GitFileState,
    prevPath?: string | null,
  ) =>
    state
      ? (["git", "patch", environmentId ?? null, cwd, path, state, prevPath ?? null] as const)
      : (["git", "patch", environmentId ?? null, cwd, path] as const),
};

export function gitPatchQueryOptions(input: {
  environmentId: EnvironmentId | null;
  cwd: string | null;
  path: string;
  prevPath?: string | null;
  state: GitFileState;
  enabled?: boolean;
}) {
  return queryOptions({
    queryKey: gitQueryKeys.patch(
      input.environmentId,
      input.cwd ?? "",
      input.path,
      input.state,
      input.prevPath,
    ),
    queryFn: async () => {
      if (!input.cwd) throw new Error("No project");
      const api = readNativeGitApi(input.environmentId);
      if (!api) {
        throw new Error("Git patch API not available");
      }
      const result = await api.getFilePatch({
        cwd: input.cwd,
        path: input.path,
        ...(input.prevPath ? { prevPath: input.prevPath } : {}),
      });
      switch (result.kind) {
        case "patch":
        case "untracked":
          return {
            kind: result.kind,
            patch: result.patch,
            message: null,
          } satisfies GitPatchData;
        case "rename_only":
        case "empty":
          return {
            kind: result.kind,
            patch: null,
            message: result.message,
          } satisfies GitPatchData;
      }
    },
    enabled: (input.enabled ?? true) && Boolean(input.cwd),
    staleTime: 0,
    gcTime: GIT_PATCH_CACHE_GC_TIME_MS,
  });
}
