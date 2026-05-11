import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";

import * as CodexError from "../errors.ts";

const formatSchemaIssue = SchemaIssue.makeFormatterDefault();

const LEGACY_CODEX_SERVICE_TIER_ALIASES: Readonly<Record<string, "fast" | "flex">> = {
  priority: "fast",
};

function normalizeCodexServiceTierValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  return LEGACY_CODEX_SERVICE_TIER_ALIASES[value.trim().toLowerCase()] ?? value;
}

function normalizeCodexServiceTierPayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    let changed = false;
    const normalized = payload.map((item) => {
      const next = normalizeCodexServiceTierPayload(item);
      if (next !== item) {
        changed = true;
      }
      return next;
    });
    return changed ? normalized : payload;
  }

  if (payload === null || typeof payload !== "object") {
    return payload;
  }

  let changed = false;
  const record = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const next =
      key === "serviceTier"
        ? normalizeCodexServiceTierValue(value)
        : normalizeCodexServiceTierPayload(value);
    if (next !== value) {
      changed = true;
    }
    normalized[key] = next;
  }
  return changed ? normalized : payload;
}

export const JsonRpcId = Schema.Union([Schema.Number, Schema.String]);

export const JsonRpcError = Schema.Struct({
  code: Schema.Number,
  message: Schema.String,
  data: Schema.optional(Schema.Unknown),
});

export const JsonRpcResponseEnvelope = Schema.Struct({
  id: JsonRpcId,
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(JsonRpcError),
});

export const decodeOptionalPayload = <A, I>(
  method: string,
  schema: Schema.Codec<A, I> | undefined,
  raw: unknown,
): Effect.Effect<A, CodexError.CodexAppServerRequestError> => {
  if (!schema) {
    if (raw === undefined) {
      return Effect.sync(() => undefined as A);
    }
    return Effect.fail(
      CodexError.CodexAppServerRequestError.invalidParams(`${method} does not accept params`, raw),
    );
  }

  return Schema.decodeUnknownEffect(schema)(normalizeCodexServiceTierPayload(raw)).pipe(
    Effect.mapError((error) =>
      CodexError.CodexAppServerRequestError.invalidParams(
        `Invalid ${method} payload: ${formatSchemaIssue(error.issue)}`,
        { issue: error.issue },
      ),
    ),
  );
};

export const encodeOptionalPayload = <A, I>(
  method: string,
  schema: Schema.Codec<A, I> | undefined,
  payload: A,
): Effect.Effect<I | undefined, CodexError.CodexAppServerRequestError> => {
  if (!schema) {
    if (payload === undefined) {
      return Effect.sync(() => undefined);
    }
    return Effect.fail(
      CodexError.CodexAppServerRequestError.invalidParams(
        `${method} does not accept params`,
        payload,
      ),
    );
  }

  return Schema.encodeEffect(schema)(normalizeCodexServiceTierPayload(payload) as A).pipe(
    Effect.mapError((error) =>
      CodexError.CodexAppServerRequestError.invalidParams(
        `Invalid ${method} payload: ${formatSchemaIssue(error.issue)}`,
        { issue: error.issue },
      ),
    ),
  );
};

export const decodeNotificationPayload = <A, I>(
  method: string,
  schema: Schema.Codec<A, I> | undefined,
  raw: unknown,
): Effect.Effect<A, CodexError.CodexAppServerProtocolParseError> =>
  decodeOptionalPayload(method, schema, raw).pipe(
    Effect.mapError(
      (error) =>
        new CodexError.CodexAppServerProtocolParseError({
          detail: error.message,
          cause: error,
        }),
    ),
  );

export const runHandler = Effect.fnUntraced(function* <A, B>(
  handler: ((payload: A) => Effect.Effect<B, CodexError.CodexAppServerError>) | undefined,
  payload: A,
  method: string,
) {
  if (!handler) {
    return yield* CodexError.CodexAppServerRequestError.methodNotFound(method);
  }

  return yield* handler(payload).pipe(
    Effect.mapError((error) => CodexError.normalizeToRequestError(error)),
  );
});
