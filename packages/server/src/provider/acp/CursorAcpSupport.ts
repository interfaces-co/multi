import { type CursorSettings, type ProviderOptionSelection } from "@multi/contracts";
import { Effect, Layer, Scope } from "effect";
import { ChildProcessSpawner } from "effect/unstable/process";
import type * as EffectAcpErrors from "effect-acp/errors";
import type * as EffectAcpSchema from "effect-acp/schema";

import {
  CURSOR_PARAMETERIZED_MODEL_PICKER_CAPABILITIES,
  resolveCursorAcpBaseModelId,
  resolveCursorAcpConfigUpdates,
  resolveCursorAgentCliModelId,
} from "../CursorProvider.ts";
import {
  AcpSessionRuntime,
  type AcpSessionRuntimeOptions,
  type AcpSessionRuntimeShape,
  type AcpSpawnInput,
} from "./AcpSessionRuntime.ts";
import { findSessionConfigOption } from "./AcpRuntimeModel.ts";

type CursorAcpRuntimeCursorSettings = Pick<CursorSettings, "apiEndpoint" | "binaryPath">;

export interface CursorAcpRuntimeInput extends Omit<
  AcpSessionRuntimeOptions,
  "authMethodId" | "clientCapabilities" | "spawn"
> {
  readonly childProcessSpawner: ChildProcessSpawner.ChildProcessSpawner["Service"];
  readonly cursorSettings: CursorAcpRuntimeCursorSettings | null | undefined;
  readonly spawnModel?: string | null | undefined;
  readonly spawnSelections?: ReadonlyArray<ProviderOptionSelection> | null | undefined;
}

export type CursorAcpModelSelectionErrorContext =
  | {
      readonly cause: EffectAcpErrors.AcpError;
      readonly method: "session/set_model";
      readonly step: "set-model";
    }
  | {
      readonly cause: EffectAcpErrors.AcpError;
      readonly configId: string;
      readonly method: "session/set_config_option";
      readonly step: "set-config-option";
    };

export function buildCursorAcpSpawnInput(
  cursorSettings: CursorAcpRuntimeCursorSettings | null | undefined,
  cwd: string,
  spawn?: {
    readonly model?: string | null | undefined;
    readonly selections?: ReadonlyArray<ProviderOptionSelection> | null | undefined;
  },
): AcpSpawnInput {
  const cliModel = spawn
    ? resolveCursorAgentCliModelId(spawn.model ?? null, spawn.selections)
    : undefined;
  return {
    command: cursorSettings?.binaryPath || "agent",
    args: [
      ...(cursorSettings?.apiEndpoint ? (["-e", cursorSettings.apiEndpoint] as const) : []),
      ...(cliModel ? (["--model", cliModel] as const) : []),
      "acp",
    ],
    cwd,
  };
}

export function resolveCursorAcpSpawnCliModelId(input: {
  readonly model?: string | null | undefined;
  readonly selections?: ReadonlyArray<ProviderOptionSelection> | null | undefined;
}): string | undefined {
  return resolveCursorAgentCliModelId(input.model ?? null, input.selections);
}

export const makeCursorAcpRuntime = (
  input: CursorAcpRuntimeInput,
): Effect.Effect<AcpSessionRuntimeShape, EffectAcpErrors.AcpError, Scope.Scope> =>
  Effect.gen(function* () {
    const acpContext = yield* Layer.build(
      AcpSessionRuntime.layer({
        ...input,
        spawn: buildCursorAcpSpawnInput(input.cursorSettings, input.cwd, {
          model: input.spawnModel ?? null,
          selections: input.spawnSelections,
        }),
        authMethodId: "cursor_login",
        clientCapabilities: CURSOR_PARAMETERIZED_MODEL_PICKER_CAPABILITIES,
      }).pipe(
        Layer.provide(
          Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, input.childProcessSpawner),
        ),
      ),
    );
    return yield* Effect.service(AcpSessionRuntime).pipe(Effect.provide(acpContext));
  });

interface CursorAcpModelSelectionRuntime {
  readonly getConfigOptions: AcpSessionRuntimeShape["getConfigOptions"];
  readonly setConfigOption: (
    configId: string,
    value: string | boolean,
  ) => Effect.Effect<unknown, EffectAcpErrors.AcpError>;
  readonly setModel: (model: string) => Effect.Effect<unknown, EffectAcpErrors.AcpError>;
}

function configOptionCurrentValueMatches(
  configOption: EffectAcpSchema.SessionConfigOption,
  value: string | boolean,
): boolean {
  const currentValue = configOption.currentValue;
  if (configOption.type === "boolean") {
    return currentValue === value;
  }
  if (typeof currentValue !== "string") {
    return false;
  }
  return currentValue.trim() === String(value).trim();
}

function findCursorModelConfigOption(
  configOptions: ReadonlyArray<EffectAcpSchema.SessionConfigOption>,
): EffectAcpSchema.SessionConfigOption | undefined {
  return configOptions.find((option) => option.category === "model" && option.id.trim().length > 0);
}

export function applyCursorAcpModelSelection<E>(input: {
  readonly runtime: CursorAcpModelSelectionRuntime;
  readonly model: string | null | undefined;
  readonly selections: ReadonlyArray<ProviderOptionSelection> | null | undefined;
  readonly mapError: (context: CursorAcpModelSelectionErrorContext) => E;
}): Effect.Effect<void, E> {
  return Effect.gen(function* () {
    let configOptions = yield* input.runtime.getConfigOptions;
    const baseModelId = resolveCursorAcpBaseModelId(input.model);
    const modelOption = findCursorModelConfigOption(configOptions);
    const modelAlreadySelected =
      modelOption !== undefined && configOptionCurrentValueMatches(modelOption, baseModelId);
    if (!modelAlreadySelected) {
      yield* input.runtime.setModel(baseModelId).pipe(
        Effect.mapError((cause) =>
          input.mapError({
            cause,
            method: "session/set_model",
            step: "set-model",
          }),
        ),
      );
      configOptions = yield* input.runtime.getConfigOptions;
    }

    const configUpdates = resolveCursorAcpConfigUpdates(configOptions, input.selections);
    for (const update of configUpdates) {
      const configOption = findSessionConfigOption(configOptions, update.configId);
      if (
        configOption !== undefined &&
        configOptionCurrentValueMatches(configOption, update.value)
      ) {
        continue;
      }
      yield* input.runtime.setConfigOption(update.configId, update.value).pipe(
        Effect.mapError((cause) =>
          input.mapError({
            cause,
            configId: update.configId,
            method: "session/set_config_option",
            step: "set-config-option",
          }),
        ),
      );
    }
  });
}
