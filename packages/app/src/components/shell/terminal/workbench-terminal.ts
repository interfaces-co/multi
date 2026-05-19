import type { EnvironmentApi, EnvironmentId } from "@multi/contracts";

import { readNativeEnvironmentApi } from "~/lib/native-runtime-api";

type WorkbenchTerminalApi = EnvironmentApi["terminal"];

export function workbenchTerminalThreadId(cwd: string): string {
  return `workbench:${cwd}`;
}

export function readWorkbenchTerminalApi(
  environmentId: EnvironmentId | null | undefined,
): WorkbenchTerminalApi | null {
  return (
    readNativeEnvironmentApi(environmentId, {
      allowPrimaryEnvironmentFallback: true,
    })?.terminal ?? null
  );
}
