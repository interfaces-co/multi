import type { EnvironmentId } from "@multi/contracts";
import type { WsRpcClient } from "~/ws-rpc-client";

import { readNativeEnvironmentApi, readNativeRuntimeApi } from "~/native-api";

export interface NativeGitApi {
  refreshStatus: WsRpcClient["git"]["refreshStatus"];
  onStatus: WsRpcClient["git"]["onStatus"];
  init: WsRpcClient["git"]["init"];
  discardPaths?: (input: { cwd: string; paths: string[] }) => Promise<void>;
  getFilePatch?: (input: { cwd: string; path: string }) => Promise<{ unifiedDiff: string }>;
}

function isNativeGitApi(nativeGit: unknown): nativeGit is NativeGitApi {
  if (!nativeGit || typeof nativeGit !== "object") {
    return false;
  }
  const gitApi = nativeGit as Partial<NativeGitApi>;
  if (
    typeof gitApi.refreshStatus !== "function" ||
    typeof gitApi.onStatus !== "function" ||
    typeof gitApi.init !== "function"
  ) {
    return false;
  }
  return true;
}

export function readNativeGitApi(environmentId?: EnvironmentId | null): NativeGitApi | null {
  const runtimeGit = readNativeRuntimeApi(environmentId, {
    allowPrimaryEnvironmentFallback: true,
  })?.git;
  if (isNativeGitApi(runtimeGit)) {
    return runtimeGit;
  }

  const environmentGit = readNativeEnvironmentApi(environmentId, {
    allowPrimaryEnvironmentFallback: true,
  })?.git;
  return isNativeGitApi(environmentGit) ? environmentGit : null;
}
