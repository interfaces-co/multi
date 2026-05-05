import type { FileDiffMetadata } from "@pierre/diffs";
import type { EnvironmentId } from "@multi/contracts";
import { parsePatchFiles } from "@pierre/diffs";
import { queryOptions } from "@tanstack/react-query";

import type { GitFileState } from "~/lib/ui-session-types";
import { readNativeGitApi } from "~/lib/native-git-api";

export interface GitPatchData {
  patch: string;
  diff: FileDiffMetadata | null;
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

function firstFile(patch: string): FileDiffMetadata | null {
  const text = patch.trim();
  if (text.length < 1) return null;

  try {
    const patches = parsePatchFiles(text);
    for (const patch of patches) {
      const file = patch.files[0];
      if (file) return file;
    }
  } catch {}

  return null;
}

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
      return {
        patch: result.unifiedDiff,
        diff: firstFile(result.unifiedDiff),
      } satisfies GitPatchData;
    },
    enabled: (input.enabled ?? true) && Boolean(input.cwd),
    staleTime: Infinity,
    gcTime: GIT_PATCH_CACHE_GC_TIME_MS,
  });
}
