import { QueryClient } from "@tanstack/react-query";
import { EnvironmentId } from "@multi/contracts";
import { describe, expect, it } from "vitest";

import { gitQueryKeys, invalidateGitPatchQueries } from "./native-git-react-query";

const ENVIRONMENT_A = EnvironmentId.make("environment-a");
const ENVIRONMENT_B = EnvironmentId.make("environment-b");

describe("invalidateGitPatchQueries", () => {
  it("invalidates every patch variant for a cwd without touching other repos", async () => {
    const queryClient = new QueryClient();
    const sameCwdPatchKey = gitQueryKeys.patch(ENVIRONMENT_A, "/repo/a", "src/a.ts", "modified");
    const sameCwdRenameKey = gitQueryKeys.patch(
      ENVIRONMENT_A,
      "/repo/a",
      "src/b.ts",
      "renamed",
      "src/old-b.ts",
    );
    const otherCwdPatchKey = gitQueryKeys.patch(ENVIRONMENT_A, "/repo/b", "src/a.ts", "modified");
    const otherEnvironmentPatchKey = gitQueryKeys.patch(
      ENVIRONMENT_B,
      "/repo/a",
      "src/a.ts",
      "modified",
    );

    queryClient.setQueryData(sameCwdPatchKey, { kind: "patch", patch: "diff", message: null });
    queryClient.setQueryData(sameCwdRenameKey, { kind: "patch", patch: "diff", message: null });
    queryClient.setQueryData(otherCwdPatchKey, { kind: "patch", patch: "diff", message: null });
    queryClient.setQueryData(otherEnvironmentPatchKey, {
      kind: "patch",
      patch: "diff",
      message: null,
    });

    await invalidateGitPatchQueries(queryClient, { environmentId: ENVIRONMENT_A, cwd: "/repo/a" });

    expect(queryClient.getQueryState(sameCwdPatchKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(sameCwdRenameKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherCwdPatchKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(otherEnvironmentPatchKey)?.isInvalidated).toBe(false);
  });
});
