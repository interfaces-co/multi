/**
 * Provider event logger helper.
 *
 * Best-effort writer for observability logs. Each record is formatted as a
 * single effect-style text line in a thread-scoped file. Failures are
 * downgraded to warnings so provider runtime behavior is unaffected.
 */
import fs from "node:fs";
import path from "node:path";

import type { ThreadId } from "@multi/contracts";
import { RotatingFileSink } from "@multi/shared/logging";
import { Effect, Exit, Logger, Schema, Scope, SynchronizedRef } from "effect";

import { toSafeThreadAttachmentSegment } from "../attachment-store.ts";

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_FILES = 10;
const DEFAULT_BATCH_WINDOW_MS = 200;
const GLOBAL_THREAD_SEGMENT = "_global";
const LOG_SCOPE = "provider-observability";

class EventNdjsonLoggerError extends Schema.TaggedErrorClass<EventNdjsonLoggerError>()(
  "EventNdjsonLoggerError",
  {
    operation: Schema.String,
    detail: Schema.String,
    cause: Schema.Defect,
  },
) {}

const toEventNdjsonLoggerError =
  (operation: string, detail: string) =>
  (cause: unknown): EventNdjsonLoggerError =>
    new EventNdjsonLoggerError({
      operation,
      detail,
      cause,
    });

export type EventNdjsonStream = "native" | "canonical" | "orchestration";

export interface EventNdjsonLogger {
  readonly filePath: string;
  write: (event: unknown, threadId: ThreadId | null) => Effect.Effect<void>;
  close: () => Effect.Effect<void>;
}

export interface EventNdjsonLoggerOptions {
  readonly stream: EventNdjsonStream;
  readonly maxBytes?: number;
  readonly maxFiles?: number;
  readonly batchWindowMs?: number;
}

interface ThreadWriter {
  writeMessage: (message: string) => Effect.Effect<void>;
  close: () => Effect.Effect<void>;
}

interface LoggerState {
  readonly threadWriters: Map<string, ThreadWriter>;
  readonly failedSegments: Set<string>;
}

function logWarning(message: string, context: Record<string, unknown>): Effect.Effect<void> {
  return Effect.logWarning(message, context).pipe(Effect.annotateLogs({ scope: LOG_SCOPE }));
}

function resolveThreadSegment(raw: string | null | undefined): string {
  const normalized = typeof raw === "string" ? toSafeThreadAttachmentSegment(raw) : null;
  return normalized ?? GLOBAL_THREAD_SEGMENT;
}

function formatLoggerMessage(message: unknown): string {
  if (Array.isArray(message)) {
    return message.map((part) => (typeof part === "string" ? part : String(part))).join(" ");
  }
  return typeof message === "string" ? message : String(message);
}

function makeLineLogger(streamLabel: string): Logger.Logger<unknown, string> {
  return Logger.make(
    ({ date, message }) =>
      `[${date.toISOString()}] ${streamLabel}: ${formatLoggerMessage(message)}\n`,
  );
}

function resolveStreamLabel(stream: EventNdjsonStream): string {
  switch (stream) {
    case "native":
      return "NTIVE";
    case "canonical":
    case "orchestration":
    default:
      return "CANON";
  }
}

const toLogMessage = Effect.fn("toLogMessage")(function* (
  event: unknown,
): Effect.fn.Return<string | undefined> {
  const serialized = yield* Effect.try({
    try: () => JSON.stringify(event),
    catch: toEventNdjsonLoggerError(
      "providerEventLog.serialize",
      "Failed to serialize provider event log record.",
    ),
  }).pipe(
    Effect.catch((error) =>
      logWarning("failed to serialize provider event log record", {
        error,
      }).pipe(Effect.as(undefined)),
    ),
  );

  if (typeof serialized !== "string") {
    return undefined;
  }

  return serialized;
});

const makeThreadWriter = Effect.fn("makeThreadWriter")(function* (input: {
  readonly filePath: string;
  readonly maxBytes: number;
  readonly maxFiles: number;
  readonly batchWindowMs: number;
  readonly streamLabel: string;
}): Effect.fn.Return<ThreadWriter | undefined> {
  const sink = yield* Effect.try({
    try: () =>
      new RotatingFileSink({
        filePath: input.filePath,
        maxBytes: input.maxBytes,
        maxFiles: input.maxFiles,
        throwOnError: true,
      }),
    catch: toEventNdjsonLoggerError(
      "providerEventLog.openThreadWriter",
      "Failed to initialize provider thread log file.",
    ),
  }).pipe(
    Effect.catch((error) =>
      logWarning("failed to initialize provider thread log file", {
        filePath: input.filePath,
        error,
      }).pipe(Effect.as(undefined)),
    ),
  );

  if (!sink) return undefined;

  const scope = yield* Scope.make();
  const lineLogger = makeLineLogger(input.streamLabel);
  const batchedLogger = yield* Logger.batched(lineLogger, {
    window: input.batchWindowMs,
    flush: Effect.fn("makeThreadWriter.flush")(function* (messages) {
      yield* Effect.forEach(
        messages,
        (message) =>
          Effect.try({
            try: () => sink.write(message),
            catch: toEventNdjsonLoggerError(
              "providerEventLog.flush",
              "Provider event log batch flush failed.",
            ),
          }),
        { discard: true },
      ).pipe(
        Effect.catch((error) =>
          logWarning("provider event log batch flush failed", {
            filePath: input.filePath,
            error,
          }),
        ),
      );
    }),
  }).pipe(Effect.provideService(Scope.Scope, scope));

  const loggerLayer = Logger.layer([batchedLogger], { mergeWithExisting: false });

  return {
    writeMessage(message: string) {
      return Effect.log(message).pipe(Effect.provide(loggerLayer));
    },
    close() {
      return Scope.close(scope, Exit.void);
    },
  } satisfies ThreadWriter;
});

export const makeEventNdjsonLogger = Effect.fn("makeEventNdjsonLogger")(function* (
  filePath: string,
  options: EventNdjsonLoggerOptions,
): Effect.fn.Return<EventNdjsonLogger | undefined> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const batchWindowMs = options.batchWindowMs ?? DEFAULT_BATCH_WINDOW_MS;
  const streamLabel = resolveStreamLabel(options.stream);

  const directoryReady = yield* Effect.try({
    try: () => fs.mkdirSync(path.dirname(filePath), { recursive: true }),
    catch: toEventNdjsonLoggerError(
      "providerEventLog.createDirectory",
      "Failed to create provider event log directory.",
    ),
  }).pipe(
    Effect.as(true),
    Effect.catch((error) =>
      logWarning("failed to create provider event log directory", {
        filePath,
        error,
      }).pipe(Effect.as(false)),
    ),
  );
  if (!directoryReady) {
    return undefined;
  }

  const stateRef = yield* SynchronizedRef.make<LoggerState>({
    threadWriters: new Map(),
    failedSegments: new Set(),
  });

  const resolveThreadWriter = Effect.fn("resolveThreadWriter")(function* (
    threadSegment: string,
  ): Effect.fn.Return<ThreadWriter | undefined> {
    return yield* SynchronizedRef.modifyEffect(stateRef, (state) => {
      if (state.failedSegments.has(threadSegment)) {
        return Effect.succeed([undefined, state] as const);
      }

      const existing = state.threadWriters.get(threadSegment);
      if (existing) {
        return Effect.succeed([existing, state] as const);
      }

      return makeThreadWriter({
        filePath: path.join(path.dirname(filePath), `${threadSegment}.log`),
        maxBytes,
        maxFiles,
        batchWindowMs,
        streamLabel,
      }).pipe(
        Effect.map((writer) => {
          if (!writer) {
            const nextFailedSegments = new Set(state.failedSegments);
            nextFailedSegments.add(threadSegment);
            return [
              undefined,
              {
                ...state,
                failedSegments: nextFailedSegments,
              },
            ] as const;
          }

          const nextThreadWriters = new Map(state.threadWriters);
          nextThreadWriters.set(threadSegment, writer);
          return [
            writer,
            {
              ...state,
              threadWriters: nextThreadWriters,
            },
          ] as const;
        }),
      );
    });
  });

  const write = Effect.fn("write")(function* (event: unknown, threadId: ThreadId | null) {
    const threadSegment = resolveThreadSegment(threadId);
    const message = yield* toLogMessage(event);
    if (!message) {
      return;
    }

    const writer = yield* resolveThreadWriter(threadSegment);
    if (!writer) {
      return;
    }

    yield* writer.writeMessage(message);
  });

  const close = Effect.fn("close")(function* () {
    yield* SynchronizedRef.modifyEffect(stateRef, (state) =>
      Effect.gen(function* () {
        for (const writer of state.threadWriters.values()) {
          yield* writer.close();
        }

        return [
          undefined,
          {
            threadWriters: new Map<string, ThreadWriter>(),
            failedSegments: new Set<string>(),
          },
        ] as const;
      }),
    );
  });

  return {
    filePath,
    write,
    close,
  } satisfies EventNdjsonLogger;
});
