import {
  OrchestrationGetTurnDiffResult,
  type OrchestrationGetFullThreadDiffInput,
  type OrchestrationGetFullThreadDiffResult,
  type OrchestrationGetTurnDiffResult as OrchestrationGetTurnDiffResultType,
} from "@multi/contracts";
import { Effect, Layer, Option, Schema } from "effect";

import { ThreadProjection } from "../orchestration/ThreadProjection.service.ts";
import { CheckpointInvariantError, CheckpointUnavailableError } from "./Errors.ts";
import { checkpointRefForThreadTurn, preTurnCheckpointRefForThreadTurn } from "./Utils.ts";
import { CheckpointStore } from "./CheckpointStore.service.ts";
import {
  CheckpointDiffQuery,
  type CheckpointDiffQueryShape,
} from "./CheckpointDiffQuery.service.ts";
import { ServerConfig } from "../config.ts";
import { coerceAccessibleProjectCwd } from "../project/AccessibleProjectCwd.ts";

const isTurnDiffResult = Schema.is(OrchestrationGetTurnDiffResult);

const make = Effect.gen(function* () {
  const threadProjection = yield* ThreadProjection;
  const checkpointStore = yield* CheckpointStore;
  const serverConfig = yield* ServerConfig;

  const getTurnDiff: CheckpointDiffQueryShape["getTurnDiff"] = Effect.fn("getTurnDiff")(
    function* (input) {
      const operation = "CheckpointDiffQuery.getTurnDiff";

      if (input.fromTurnCount === input.toTurnCount) {
        const emptyDiff: OrchestrationGetTurnDiffResultType = {
          threadId: input.threadId,
          fromTurnCount: input.fromTurnCount,
          toTurnCount: input.toTurnCount,
          diff: "",
        };
        if (!isTurnDiffResult(emptyDiff)) {
          return yield* new CheckpointInvariantError({
            operation,
            detail: "Computed turn diff result does not satisfy contract schema.",
          });
        }
        return emptyDiff;
      }

      const threadContext = yield* threadProjection.getThreadCheckpointContext(input.threadId);
      if (Option.isNone(threadContext)) {
        return yield* new CheckpointInvariantError({
          operation,
          detail: `Thread '${input.threadId}' not found.`,
        });
      }

      const maxTurnCount = threadContext.value.checkpoints.reduce(
        (max, checkpoint) => Math.max(max, checkpoint.checkpointTurnCount),
        0,
      );
      if (input.toTurnCount > maxTurnCount) {
        return yield* new CheckpointUnavailableError({
          threadId: input.threadId,
          turnCount: input.toTurnCount,
          detail: `Turn diff range exceeds current turn count: requested ${input.toTurnCount}, current ${maxTurnCount}.`,
        });
      }

      const projectCwd = yield* coerceAccessibleProjectCwd({
        operation: "CheckpointDiffQuery.getTurnDiff",
        candidates: [
          { label: "thread.worktreePath", cwd: threadContext.value.worktreePath },
          { label: "project.projectRoot", cwd: threadContext.value.projectRoot },
        ],
        fallbackCwds: [{ label: "server.cwd", cwd: serverConfig.cwd }],
        threadId: input.threadId,
        projectId: threadContext.value.projectId,
      });
      if (!projectCwd) {
        return yield* new CheckpointInvariantError({
          operation,
          detail: `Project path missing for thread '${input.threadId}' when computing turn diff.`,
        });
      }

      const fallbackFromCheckpointRef =
        input.fromTurnCount === 0
          ? checkpointRefForThreadTurn(input.threadId, 0)
          : threadContext.value.checkpoints.find(
              (checkpoint) => checkpoint.checkpointTurnCount === input.fromTurnCount,
            )?.checkpointRef;
      const singleTurnPreTurnCheckpointRef =
        input.toTurnCount === input.fromTurnCount + 1
          ? preTurnCheckpointRefForThreadTurn(input.threadId, input.toTurnCount)
          : null;
      const preTurnCheckpointExists = singleTurnPreTurnCheckpointRef
        ? yield* checkpointStore.hasCheckpointRef({
            cwd: projectCwd,
            checkpointRef: singleTurnPreTurnCheckpointRef,
          })
        : false;
      const fromCheckpointRef = preTurnCheckpointExists
        ? singleTurnPreTurnCheckpointRef
        : fallbackFromCheckpointRef;
      if (!fromCheckpointRef) {
        return yield* new CheckpointUnavailableError({
          threadId: input.threadId,
          turnCount: input.fromTurnCount,
          detail: `Checkpoint ref is unavailable for turn ${input.fromTurnCount}.`,
        });
      }

      const toCheckpointRef = threadContext.value.checkpoints.find(
        (checkpoint) => checkpoint.checkpointTurnCount === input.toTurnCount,
      )?.checkpointRef;
      if (!toCheckpointRef) {
        return yield* new CheckpointUnavailableError({
          threadId: input.threadId,
          turnCount: input.toTurnCount,
          detail: `Checkpoint ref is unavailable for turn ${input.toTurnCount}.`,
        });
      }

      const diff = yield* checkpointStore.diffCheckpoints({
        cwd: projectCwd,
        fromCheckpointRef,
        toCheckpointRef,
        fallbackFromToHead: false,
      });

      const turnDiff: OrchestrationGetTurnDiffResultType = {
        threadId: input.threadId,
        fromTurnCount: input.fromTurnCount,
        toTurnCount: input.toTurnCount,
        diff,
      };
      if (!isTurnDiffResult(turnDiff)) {
        return yield* new CheckpointInvariantError({
          operation,
          detail: "Computed turn diff result does not satisfy contract schema.",
        });
      }

      return turnDiff;
    },
  );

  const getFullThreadDiff: CheckpointDiffQueryShape["getFullThreadDiff"] = Effect.fn(
    "getFullThreadDiff",
  )(function* (input: OrchestrationGetFullThreadDiffInput) {
    const operation = "CheckpointDiffQuery.getFullThreadDiff";

    if (input.toTurnCount === 0) {
      const emptyDiff: OrchestrationGetFullThreadDiffResult = {
        threadId: input.threadId,
        fromTurnCount: 0,
        toTurnCount: 0,
        diff: "",
      };
      if (!isTurnDiffResult(emptyDiff)) {
        return yield* new CheckpointInvariantError({
          operation,
          detail: "Computed full thread diff result does not satisfy contract schema.",
        });
      }
      return emptyDiff;
    }

    const threadContext = yield* threadProjection.getThreadCheckpointContext(input.threadId);
    if (Option.isNone(threadContext)) {
      return yield* new CheckpointInvariantError({
        operation,
        detail: `Thread '${input.threadId}' not found.`,
      });
    }

    const maxTurnCount = threadContext.value.checkpoints.reduce(
      (max, checkpoint) => Math.max(max, checkpoint.checkpointTurnCount),
      0,
    );
    if (input.toTurnCount > maxTurnCount) {
      return yield* new CheckpointUnavailableError({
        threadId: input.threadId,
        turnCount: input.toTurnCount,
        detail: `Full thread diff range exceeds current turn count: requested ${input.toTurnCount}, current ${maxTurnCount}.`,
      });
    }

    const projectCwd = yield* coerceAccessibleProjectCwd({
      operation,
      candidates: [
        { label: "thread.worktreePath", cwd: threadContext.value.worktreePath },
        { label: "project.projectRoot", cwd: threadContext.value.projectRoot },
      ],
      fallbackCwds: [{ label: "server.cwd", cwd: serverConfig.cwd }],
      threadId: input.threadId,
      projectId: threadContext.value.projectId,
    });
    if (!projectCwd) {
      return yield* new CheckpointInvariantError({
        operation,
        detail: `Project path missing for thread '${input.threadId}' when computing full thread diff.`,
      });
    }

    const toCheckpointRef = threadContext.value.checkpoints.find(
      (checkpoint) => checkpoint.checkpointTurnCount === input.toTurnCount,
    )?.checkpointRef;
    if (!toCheckpointRef) {
      return yield* new CheckpointUnavailableError({
        threadId: input.threadId,
        turnCount: input.toTurnCount,
        detail: `Checkpoint ref is unavailable for turn ${input.toTurnCount}.`,
      });
    }

    const diff = yield* checkpointStore.diffCheckpoints({
      cwd: projectCwd,
      fromCheckpointRef: checkpointRefForThreadTurn(input.threadId, 0),
      toCheckpointRef,
      fallbackFromToHead: false,
    });

    const fullThreadDiff: OrchestrationGetFullThreadDiffResult = {
      threadId: input.threadId,
      fromTurnCount: 0,
      toTurnCount: input.toTurnCount,
      diff,
    };
    if (!isTurnDiffResult(fullThreadDiff)) {
      return yield* new CheckpointInvariantError({
        operation,
        detail: "Computed full thread diff result does not satisfy contract schema.",
      });
    }

    return fullThreadDiff;
  });

  return {
    getTurnDiff,
    getFullThreadDiff,
  } satisfies CheckpointDiffQueryShape;
});

export const CheckpointDiffQueryLive = Layer.effect(CheckpointDiffQuery, make);
