import type { EnvironmentId } from "@t3tools/contracts";
import type { WsRpcClient } from "~/ws-rpc-client";

import { readGlassEnvironmentApi, readGlassRuntimeApi } from "~/native-api";

export interface GlassGitApi {
  refreshStatus: WsRpcClient["git"]["refreshStatus"];
  onStatus: WsRpcClient["git"]["onStatus"];
  init: WsRpcClient["git"]["init"];
  discardPaths?: (input: { cwd: string; paths: string[] }) => Promise<void>;
  getFilePatch?: (input: { cwd: string; path: string }) => Promise<{ unifiedDiff: string }>;
}

function isGlassGitApi(nativeGit: unknown): nativeGit is GlassGitApi {
  if (!nativeGit || typeof nativeGit !== "object") {
    return false;
  }
  const gitApi = nativeGit as Partial<GlassGitApi>;
  if (
    typeof gitApi.refreshStatus !== "function" ||
    typeof gitApi.onStatus !== "function" ||
    typeof gitApi.init !== "function"
  ) {
    return false;
  }
  return true;
}

export function readGlassGitApi(environmentId?: EnvironmentId | null): GlassGitApi | null {
  const runtimeGit = readGlassRuntimeApi(environmentId, {
    allowPrimaryEnvironmentFallback: true,
  })?.git;
  if (isGlassGitApi(runtimeGit)) {
    return runtimeGit;
  }

  const environmentGit = readGlassEnvironmentApi(environmentId, {
    allowPrimaryEnvironmentFallback: true,
  })?.git;
  return isGlassGitApi(environmentGit) ? environmentGit : null;
}
