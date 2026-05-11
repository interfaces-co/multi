import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { EnvironmentId, type GitStatusResult } from "@multi/contracts";

import { gitQueryKeys } from "../lib/native-git-react-query";
import { type DiffRow, revalidateGitPanelPatches, syncRows } from "./use-environment-git";

function row(id: string, part?: Partial<DiffRow>) {
  return {
    id,
    path: id,
    prevPath: null,
    state: "modified",
    staged: false,
    unstaged: true,
    add: 1,
    del: 0,
    ...part,
  } satisfies DiffRow;
}

describe("syncRows", () => {
  it("keeps unchanged rows cached", () => {
    const out = syncRows([row("a")], [row("a")]);

    expect([...out.ids]).toEqual(["a"]);
    expect([...out.drop]).toEqual([]);
  });

  it("invalidates changed rows only", () => {
    const out = syncRows([row("a"), row("b")], [row("a", { add: 2 }), row("b")]);

    expect([...out.ids]).toEqual(["a", "b"]);
    expect([...out.drop]).toEqual(["a"]);
  });

  it("does not invalidate brand new rows", () => {
    const out = syncRows([], [row("a")]);

    expect([...out.ids]).toEqual(["a"]);
    expect([...out.drop]).toEqual([]);
  });
});

describe("revalidateGitPanelPatches", () => {
  it("invalidates cached patch data even when row metadata is unchanged", async () => {
    const queryClient = new QueryClient();
    const environmentId = EnvironmentId.make("environment-a");
    const cwd = "/repo/a";
    const patchQueryKey = gitQueryKeys.patch(environmentId, cwd, "src/a.ts", "modified");
    const status: GitStatusResult = {
      isRepo: true,
      hasOriginRemote: true,
      isDefaultBranch: false,
      branch: "feature/git-panel",
      hasWorkingTreeChanges: true,
      workingTree: {
        files: [
          {
            path: "src/a.ts",
            insertions: 1,
            deletions: 0,
            status: "modified",
          },
        ],
        insertions: 1,
        deletions: 0,
      },
      hasUpstream: true,
      aheadCount: 0,
      behindCount: 0,
      pr: null,
    };
    const api = {
      refreshStatus: async () => status,
    };
    queryClient.setQueryData(patchQueryKey, {
      kind: "patch",
      patch: "old diff",
      message: null,
    });

    await revalidateGitPanelPatches({ environmentId, cwd, api, queryClient });

    expect(queryClient.getQueryState(patchQueryKey)?.isInvalidated).toBe(true);
  });
});
