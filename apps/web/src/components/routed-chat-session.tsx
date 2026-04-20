// @ts-nocheck
import type { EnvironmentId, ThreadId, ProviderInteractionMode } from "@multi/contracts";
import type { UiPromptInput, UiSessionItem, UiWorkingState } from "~/lib/ui-session-types";
import type { RuntimeModelItem } from "~/lib/runtime-models";
import type { ThinkingLevel } from "~/lib/ui-session-types";

import { useCallback, useMemo, useRef } from "react";

import { ChatComposer, type ChatComposerHandle } from "./shell/composer/chat";
import { ChatMessages } from "./shell/chat/messages";
import { useChatDraftStore } from "~/lib/chat-draft-store";
import { useStore } from "~/store";
import { createThreadSelectorByRef } from "~/store-selectors";
import { readEnvironmentApi } from "~/environment-api";
import { newCommandId } from "~/lib/utils";
import { sendChatPrompt, type SendChatPromptContext } from "~/lib/chat-send-adapter";

function mapMessagesToSessionItems(
  messages: ReadonlyArray<{
    id?: string;
    messageId?: string;
    role: string;
    text?: string;
    content?: unknown;
    createdAt?: string;
  }>,
): UiSessionItem[] {
  return messages.map((msg, i) => ({
    id: (msg as { id?: string }).id ?? (msg as { messageId?: string }).messageId ?? String(i),
    createdAt: (msg as { createdAt?: string }).createdAt ?? new Date().toISOString(),
    message:
      msg.role === "assistant"
        ? {
            role: "assistant" as const,
            content: [{ type: "text" as const, text: (msg as { text?: string }).text ?? "" }],
          }
        : {
            role: "user" as const,
            content: (msg as { text?: string }).text ?? "",
          },
  }));
}

export function RoutedChatSession(props: {
  threadId?: ThreadId;
  environmentId: EnvironmentId;
  routeKind: "server" | "draft";
  draftId?: string;
}) {
  const { threadId, environmentId } = props;
  const composerRef = useRef<ChatComposerHandle>(null);

  const threadSelector = useMemo(
    () => createThreadSelectorByRef(threadId ? { environmentId, threadId } : null),
    [environmentId, threadId],
  );
  const thread = useStore(threadSelector) ?? null;

  const draft = useChatDraftStore((s) => s.root);
  const saveRoot = useChatDraftStore((s) => s.saveRoot);

  const items = useMemo<UiSessionItem[]>(() => {
    if (!thread) return [];
    return mapMessagesToSessionItems(thread.messages as never);
  }, [thread]);

  const busy = thread?.session?.orchestrationStatus === "running";
  const work: UiWorkingState | null = null;

  const onDraft = useCallback(
    (value: string) => saveRoot(value, draft.files, draft.skills),
    [draft.files, draft.skills, saveRoot],
  );

  const onSend = useCallback(
    async (input: UiPromptInput): Promise<{ clear: boolean } | false> => {
      if (!threadId || !environmentId || !thread) return false;
      const ctx: SendChatPromptContext = {
        environmentId,
        threadId,
        modelSelection: thread.modelSelection,
        runtimeMode: thread.runtimeMode,
        interactionMode: thread.interactionMode,
        titleSeed: input.text.slice(0, 80),
      };
      return sendChatPrompt(input, ctx);
    },
    [environmentId, thread, threadId],
  );

  const onAbort = useCallback(() => {
    if (!thread?.session?.activeTurnId || !environmentId) return;
    const api = readEnvironmentApi(environmentId);
    if (!api) return;
    void api.orchestration.dispatchCommand({
      type: "thread.turn.interrupt",
      commandId: newCommandId(),
      threadId: thread.id,
      turnId: thread.session.activeTurnId,
      createdAt: new Date().toISOString(),
    });
  }, [environmentId, thread]);

  const onModel = useCallback((_item: RuntimeModelItem) => {
    // TODO: wire to setProviderModelSelect via the composer draft store
  }, []);

  const onThinkingLevel = useCallback((_level: ThinkingLevel) => {
    // TODO: wire to the composer draft store thinking level
  }, []);

  const interactionMode: ProviderInteractionMode = thread?.interactionMode ?? "default";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ChatMessages
          items={items}
          work={work}
          workLog={[]}
          plans={[]}
          busy={busy}
          thinking={false}
          since={null}
          expanded={false}
        />
      </div>

      <div className="shrink-0">
        <ChatComposer
          ref={composerRef}
          variant="dock"
          sessionId={threadId ?? null}
          draft={draft.text}
          files={draft.files}
          skills={draft.skills}
          onDraft={onDraft}
          onSend={onSend}
          onAbort={onAbort}
          onModel={onModel}
          onThinkingLevel={onThinkingLevel}
          model={null}
          busy={busy}
          planActive={interactionMode === "plan"}
        />
      </div>
    </div>
  );
}
