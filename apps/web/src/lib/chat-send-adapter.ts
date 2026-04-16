import type {
  EnvironmentId,
  ModelSelection,
  ProviderInteractionMode,
  RuntimeMode,
  ThreadId,
} from "@t3tools/contracts";
import type { GlassPromptInput } from "~/lib/glass-types";
import { readEnvironmentApi } from "~/environmentApi";
import { newCommandId, newMessageId } from "~/lib/utils";

interface ChatImageAttachment {
  type: "image";
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

function foldAttachments(input: GlassPromptInput): {
  text: string;
  attachments: ChatImageAttachment[];
} {
  const inline = (input.attachments ?? []).flatMap((item) => {
    if (item.type !== "inline") return [];
    return [
      {
        type: "image" as const,
        name: item.name,
        mimeType: item.mimeType,
        sizeBytes: Math.floor((item.data.length * 3) / 4),
        dataUrl: `data:${item.mimeType};base64,${item.data}`,
      },
    ];
  });
  const refs = (input.attachments ?? [])
    .flatMap((item) => (item.type === "path" ? [item.path] : []))
    .map((item) => `@${item}`)
    .join("\n");
  const text = refs ? `${input.text.trim()}\n\n${refs}`.trim() : input.text.trim();
  return { text, attachments: inline };
}

export interface SendGlassPromptContext {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  modelSelection: ModelSelection;
  runtimeMode: RuntimeMode;
  interactionMode: ProviderInteractionMode;
  titleSeed?: string;
  bootstrap?: {
    projectId: string;
    worktreePath?: string | null;
    branch?: string | null;
  };
}

export async function sendGlassPrompt(
  input: GlassPromptInput,
  ctx: SendGlassPromptContext,
): Promise<{ clear: boolean } | false> {
  const api = readEnvironmentApi(ctx.environmentId);
  if (!api) return false;

  const { text, attachments } = foldAttachments(input);
  if (!text && attachments.length === 0) return false;

  try {
    await api.orchestration.dispatchCommand({
      type: "thread.turn.start",
      commandId: newCommandId(),
      threadId: ctx.threadId,
      message: {
        messageId: newMessageId(),
        role: "user",
        text,
        attachments,
      },
      modelSelection: ctx.modelSelection,
      runtimeMode: ctx.runtimeMode,
      interactionMode: ctx.interactionMode,
      ...(ctx.titleSeed ? { titleSeed: ctx.titleSeed } : {}),
      createdAt: new Date().toISOString(),
    });
    return { clear: true };
  } catch {
    return false;
  }
}
