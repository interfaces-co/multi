// @ts-nocheck
import { CommandId, ProjectId } from "@multi/contracts";

import { readNativeEnvironmentApi, readNativeApi } from "../native-api";
import { useStore } from "../store";
import { SHELL_LAYOUT_CHANGED_EVENT } from "./shell-runtime-constants";

const WORKSPACE_KEY = "multi:workspace-cwd";

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
    const environmentApi = readNativeEnvironmentApi(null, { allowPrimaryEnvironmentFallback: true });
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
  window.dispatchEvent(new CustomEvent(SHELL_LAYOUT_CHANGED_EVENT));
  return cwd;
}

export async function switchWorkspace(cwd: string) {
  window.localStorage.setItem(WORKSPACE_KEY, cwd);
  window.dispatchEvent(new CustomEvent(SHELL_LAYOUT_CHANGED_EVENT));
  return true;
}
