import { z } from "zod";

/** Push: one raw line from Codex app-server stdout (JSON-RPC or any text). */
export const WsCodexRawPushSchema = z.object({
  channel: z.literal("codex.raw"),
  line: z.string(),
});

export type WsCodexRawPush = z.infer<typeof WsCodexRawPushSchema>;

export const WsServerStatusPushSchema = z.object({
  channel: z.literal("server.status"),
  status: z.enum(["codex_starting", "codex_ready", "codex_stopped", "codex_error"]),
  message: z.string().optional(),
});

export type WsServerStatusPush = z.infer<typeof WsServerStatusPushSchema>;

export const WsPushSchema = z.discriminatedUnion("channel", [
  WsCodexRawPushSchema,
  WsServerStatusPushSchema,
]);

export type WsPush = z.infer<typeof WsPushSchema>;
