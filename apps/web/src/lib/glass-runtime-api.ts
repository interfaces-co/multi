import type { EnvironmentApi, EnvironmentId, LocalApi } from "@t3tools/contracts";

import { createEnvironmentApi, readEnvironmentApi } from "~/environmentApi";
import { readLocalApi } from "~/localApi";
import { getWsRpcClientForEnvironment } from "~/ws-rpc-client";

export interface ReadGlassRuntimeApiOptions {
  allowPrimaryEnvironmentFallback?: boolean;
}

export type GlassRuntimeApi = LocalApi &
  Partial<Pick<EnvironmentApi, "terminal" | "projects" | "filesystem" | "git" | "orchestration">>;

function readEnvironmentApiWithFallback(
  environmentId: EnvironmentId | null | undefined,
  options?: ReadGlassRuntimeApiOptions,
): EnvironmentApi | undefined {
  if (environmentId) {
    return readEnvironmentApi(environmentId);
  }

  if (!options?.allowPrimaryEnvironmentFallback) {
    return undefined;
  }

  try {
    return createEnvironmentApi(getWsRpcClientForEnvironment(null));
  } catch {
    return undefined;
  }
}

export function readGlassEnvironmentApi(
  environmentId: EnvironmentId | null | undefined,
  options?: ReadGlassRuntimeApiOptions,
): EnvironmentApi | undefined {
  return readEnvironmentApiWithFallback(environmentId, options);
}

export function ensureGlassEnvironmentApi(
  environmentId: EnvironmentId | null | undefined,
  options?: ReadGlassRuntimeApiOptions,
): EnvironmentApi {
  const api = readGlassEnvironmentApi(environmentId, options);
  if (!api) {
    throw new Error(
      environmentId
        ? `Environment API not found for environment ${environmentId}`
        : "Environment API not found",
    );
  }
  return api;
}

const mergedRuntimeByLocalApi = new WeakMap<LocalApi, WeakMap<EnvironmentApi, GlassRuntimeApi>>();

function getMergedRuntimeApi(localApi: LocalApi, environmentApi: EnvironmentApi): GlassRuntimeApi {
  let byEnvironmentApi = mergedRuntimeByLocalApi.get(localApi);
  if (!byEnvironmentApi) {
    byEnvironmentApi = new WeakMap();
    mergedRuntimeByLocalApi.set(localApi, byEnvironmentApi);
  }

  const cached = byEnvironmentApi.get(environmentApi);
  if (cached) return cached;

  const merged: GlassRuntimeApi = {
    ...localApi,
    terminal: environmentApi.terminal,
    projects: environmentApi.projects,
    filesystem: environmentApi.filesystem,
    git: environmentApi.git,
    orchestration: environmentApi.orchestration,
  };
  byEnvironmentApi.set(environmentApi, merged);
  return merged;
}

export function readGlassRuntimeApi(
  environmentId: EnvironmentId | null | undefined,
  options?: ReadGlassRuntimeApiOptions,
): GlassRuntimeApi | undefined {
  const localApi = readLocalApi();
  if (!localApi) {
    return undefined;
  }

  const environmentApi = readEnvironmentApiWithFallback(environmentId, options);
  if (!environmentApi) {
    return localApi;
  }

  return getMergedRuntimeApi(localApi, environmentApi);
}
