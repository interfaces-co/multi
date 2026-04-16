import type { EnvironmentApi, LocalApi } from "@t3tools/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../localApi", () => ({
  readLocalApi: vi.fn(),
}));

vi.mock("../environmentApi", () => ({
  createEnvironmentApi: vi.fn(),
  readEnvironmentApi: vi.fn(),
}));

vi.mock("../ws-rpc-client", () => ({
  getWsRpcClientForEnvironment: vi.fn(),
}));

import { createEnvironmentApi, readEnvironmentApi } from "../environmentApi";
import { readLocalApi } from "../localApi";
import { getWsRpcClientForEnvironment } from "../ws-rpc-client";

import {
  ensureGlassEnvironmentApi,
  readGlassEnvironmentApi,
  readGlassRuntimeApi,
} from "./glass-runtime-api";

const localApi = {
  dialogs: { pickFolder: vi.fn(), confirm: vi.fn() },
  shell: { openInEditor: vi.fn(), openExternal: vi.fn() },
  contextMenu: { show: vi.fn() },
  persistence: {
    getClientSettings: vi.fn(),
    setClientSettings: vi.fn(),
    getSavedEnvironmentRegistry: vi.fn(),
    setSavedEnvironmentRegistry: vi.fn(),
    getSavedEnvironmentSecret: vi.fn(),
    setSavedEnvironmentSecret: vi.fn(),
    removeSavedEnvironmentSecret: vi.fn(),
  },
  server: {
    getConfig: vi.fn(),
    refreshProviders: vi.fn(),
    upsertKeybinding: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
} as unknown as LocalApi;

const environmentApi = {
  terminal: {} as EnvironmentApi["terminal"],
  projects: {} as EnvironmentApi["projects"],
  filesystem: {} as EnvironmentApi["filesystem"],
  git: {} as EnvironmentApi["git"],
  orchestration: {} as EnvironmentApi["orchestration"],
} as EnvironmentApi;

describe("glass-runtime-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns local api when environment api is unavailable", () => {
    vi.mocked(readLocalApi).mockReturnValue(localApi);
    vi.mocked(readEnvironmentApi).mockReturnValue(undefined);

    const result = readGlassRuntimeApi("env-a" as never);
    expect(result).toBe(localApi);
  });

  it("merges local and environment capabilities when both are available", () => {
    vi.mocked(readLocalApi).mockReturnValue(localApi);
    vi.mocked(readEnvironmentApi).mockReturnValue(environmentApi);

    const result = readGlassRuntimeApi("env-a" as never);
    expect(result).toMatchObject({
      dialogs: localApi.dialogs,
      server: localApi.server,
      git: environmentApi.git,
      terminal: environmentApi.terminal,
      projects: environmentApi.projects,
      orchestration: environmentApi.orchestration,
    });
  });

  it("can fallback to primary environment when no environment id is provided", () => {
    vi.mocked(readLocalApi).mockReturnValue(localApi);
    vi.mocked(readEnvironmentApi).mockReturnValue(undefined);
    vi.mocked(getWsRpcClientForEnvironment).mockReturnValue({} as never);
    vi.mocked(createEnvironmentApi).mockReturnValue(environmentApi);

    const result = readGlassRuntimeApi(null, { allowPrimaryEnvironmentFallback: true });
    expect(getWsRpcClientForEnvironment).toHaveBeenCalledWith(null);
    expect(createEnvironmentApi).toHaveBeenCalledTimes(1);
    expect(result?.git).toBe(environmentApi.git);
  });

  it("throws when ensureGlassEnvironmentApi cannot resolve an environment api", () => {
    vi.mocked(readEnvironmentApi).mockReturnValue(undefined);
    expect(() => ensureGlassEnvironmentApi("env-a" as never)).toThrow(
      "Environment API not found for environment env-a",
    );
  });

  it("returns fallback environment api when enabled", () => {
    vi.mocked(readEnvironmentApi).mockReturnValue(undefined);
    vi.mocked(getWsRpcClientForEnvironment).mockReturnValue({} as never);
    vi.mocked(createEnvironmentApi).mockReturnValue(environmentApi);

    const result = readGlassEnvironmentApi(undefined, { allowPrimaryEnvironmentFallback: true });
    expect(result).toBe(environmentApi);
  });
});
