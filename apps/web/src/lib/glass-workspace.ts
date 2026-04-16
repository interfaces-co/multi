// @ts-nocheck
import { CommandId, ProjectId } from "@t3tools/contracts";

import { readGlassEnvironmentApi, readNativeApi } from "../native-api";
import { useStore } from "../store";
import { GLASS_SHELL_CHANGED_EVENT } from "./glass-runtime-constants";

const WORKSPACE_KEY = "glass:workspace-cwd";

function projectId() {
  const seed = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`;
  return ProjectId.makeUnsafe(`project-${seed}`);
}

export async function pickWorkspace() {
  const localApi = readNativeApi();
  if (!localApi) return null;

  const cwd = await localApi.dialogs.pickFolder();
  if (!cwd) return null;

  const hit = useStore.getState().projects.find((item) => item.cwd === cwd);
  if (!hit) {
    const environmentApi = readGlassEnvironmentApi(null, { allowPrimaryEnvironmentFallback: true });
    if (!environmentApi) {
      return null;
    }
    await environmentApi.orchestration.dispatchCommand({
      type: "project.create",
      commandId: CommandId.makeUnsafe(crypto.randomUUID()),
      projectId: projectId(),
      title:
        cwd
          .replace(/[\\/]+$/, "")
          .split(/[\\/]/)
          .at(-1) ?? cwd,
      workspaceRoot: cwd,
      defaultModelSelection: null,
      createdAt: new Date().toISOString(),
    });
  }

  window.localStorage.setItem(WORKSPACE_KEY, cwd);
  window.dispatchEvent(new CustomEvent(GLASS_SHELL_CHANGED_EVENT));
  return cwd;
}

export async function switchWorkspace(cwd: string) {
  window.localStorage.setItem(WORKSPACE_KEY, cwd);
  window.dispatchEvent(new CustomEvent(GLASS_SHELL_CHANGED_EVENT));
  return true;
}
