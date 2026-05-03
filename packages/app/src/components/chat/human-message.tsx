import { type MessageId } from "@multi/contracts";
import { memo, type ReactNode } from "react";
import { IconArrowUndoUp as Undo2Icon } from "central-icons";
import { Button } from "@multi/ui/button";
import { buildExpandedImagePreview, type ExpandedImagePreview } from "./expanded-image-preview";
import { MessageCopyButton } from "./message-copy-button";
import { TerminalContextInlineChip } from "./terminal-context-inline-chip";
import {
  deriveDisplayedUserMessageState,
  type ParsedTerminalContextEntry,
} from "~/lib/terminal-context";
import { type TimestampFormat } from "@multi/contracts/settings";
import { formatTimestamp } from "../../timestamp-format";
import {
  buildInlineTerminalContextText,
  formatInlineTerminalContextLabel,
  textContainsInlineTerminalContextLabels,
} from "./user-message-terminal-contexts";
import { type ChatMessage } from "../../types";
import {
  CursorMessageActions,
  CursorMessageBubble,
  CursorMessageMeta,
  CursorMessageMetaRow,
} from "./cursor-chat-bundle";

interface HumanMessageProps {
  message: ChatMessage;
  revertTurnCount: number | undefined;
  isRevertingCheckpoint: boolean;
  isWorking: boolean;
  timestampFormat: TimestampFormat;
  onImageExpand: (preview: ExpandedImagePreview) => void;
  onRevertUserMessage: (messageId: MessageId) => void;
}

export const HumanMessage = memo(function HumanMessage({
  message,
  revertTurnCount,
  isRevertingCheckpoint,
  isWorking,
  timestampFormat,
  onImageExpand,
  onRevertUserMessage,
}: HumanMessageProps) {
  const userImages = message.attachments ?? [];
  const displayedUserMessage = deriveDisplayedUserMessageState(message.text);
  const terminalContexts = displayedUserMessage.contexts;
  const canRevertAgentWork = typeof revertTurnCount === "number";

  const media =
    userImages.length > 0 ? (
      <div className="mb-[var(--cursor-spacing-2)] grid max-w-[420px] grid-cols-2 gap-[var(--cursor-spacing-2)]">
        {userImages.map((image) => (
          <div
            key={image.id}
            className="overflow-hidden rounded-[var(--cursor-radius-md)] border border-[var(--cursor-stroke-secondary)] bg-[var(--cursor-bg-editor)]"
          >
            {image.previewUrl ? (
              <button
                type="button"
                className="block size-full cursor-zoom-in border-0 bg-transparent p-0"
                aria-label={`Preview ${image.name}`}
                onClick={() => {
                  const preview = buildExpandedImagePreview(userImages, image.id);
                  if (!preview) return;
                  onImageExpand(preview);
                }}
              >
                <img
                  src={image.previewUrl}
                  alt={image.name}
                  className="block max-h-[220px] w-full object-cover"
                />
              </button>
            ) : (
              <div className="flex min-h-[72px] items-center justify-center px-[var(--cursor-spacing-3)] py-[var(--cursor-spacing-2)] text-center text-[11px]/[14px] text-[var(--cursor-text-tertiary)]">
                {image.name}
              </div>
            )}
          </div>
        ))}
      </div>
    ) : null;
  const body =
    displayedUserMessage.visibleText.trim().length > 0 || terminalContexts.length > 0 ? (
      <UserMessageBody
        text={displayedUserMessage.visibleText}
        terminalContexts={terminalContexts}
      />
    ) : null;
  const footer = (
    <CursorMessageMetaRow alignEnd>
      <CursorMessageActions>
        {displayedUserMessage.copyText ? (
          <MessageCopyButton text={displayedUserMessage.copyText} />
        ) : null}
        {canRevertAgentWork ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={isRevertingCheckpoint || isWorking}
            onClick={() => onRevertUserMessage(message.id)}
            title="Revert to this message"
          >
            <Undo2Icon className="size-3" />
          </Button>
        ) : null}
      </CursorMessageActions>
      <CursorMessageMeta>{formatTimestamp(message.createdAt, timestampFormat)}</CursorMessageMeta>
    </CursorMessageMetaRow>
  );

  return <CursorMessageBubble role="user" body={body} media={media} footer={footer} />;
});

const UserMessageTerminalContextInlineLabel = memo(
  function UserMessageTerminalContextInlineLabel(props: { context: ParsedTerminalContextEntry }) {
    const tooltipText =
      props.context.body.length > 0
        ? `${props.context.header}\n${props.context.body}`
        : props.context.header;

    return <TerminalContextInlineChip label={props.context.header} tooltipText={tooltipText} />;
  },
);

const UserMessageBody = memo(function UserMessageBody(props: {
  text: string;
  terminalContexts: ParsedTerminalContextEntry[];
}) {
  if (props.terminalContexts.length > 0) {
    const hasEmbeddedInlineLabels = textContainsInlineTerminalContextLabels(
      props.text,
      props.terminalContexts,
    );
    const inlinePrefix = buildInlineTerminalContextText(props.terminalContexts);
    const inlineNodes: ReactNode[] = [];

    if (hasEmbeddedInlineLabels) {
      let cursor = 0;

      for (const context of props.terminalContexts) {
        const label = formatInlineTerminalContextLabel(context.header);
        const matchIndex = props.text.indexOf(label, cursor);
        if (matchIndex === -1) {
          inlineNodes.length = 0;
          break;
        }
        if (matchIndex > cursor) {
          inlineNodes.push(
            <span key={`user-terminal-context-inline-before:${context.header}:${cursor}`}>
              {props.text.slice(cursor, matchIndex)}
            </span>,
          );
        }
        inlineNodes.push(
          <UserMessageTerminalContextInlineLabel
            key={`user-terminal-context-inline:${context.header}`}
            context={context}
          />,
        );
        cursor = matchIndex + label.length;
      }

      if (inlineNodes.length > 0) {
        if (cursor < props.text.length) {
          inlineNodes.push(
            <span key={`user-message-terminal-context-inline-rest:${cursor}`}>
              {props.text.slice(cursor)}
            </span>,
          );
        }

        return (
          <div className="agent-panel-meta-agent-chat__human-message-content">{inlineNodes}</div>
        );
      }
    }

    for (const context of props.terminalContexts) {
      inlineNodes.push(
        <UserMessageTerminalContextInlineLabel
          key={`user-terminal-context-inline:${context.header}`}
          context={context}
        />,
      );
      inlineNodes.push(
        <span key={`user-terminal-context-inline-space:${context.header}`} aria-hidden="true">
          {" "}
        </span>,
      );
    }

    if (props.text.length > 0) {
      inlineNodes.push(<span key="user-message-terminal-context-inline-text">{props.text}</span>);
    } else if (inlinePrefix.length === 0) {
      return null;
    }

    return <div className="agent-panel-meta-agent-chat__human-message-content">{inlineNodes}</div>;
  }

  if (props.text.length === 0) {
    return null;
  }

  return <div className="agent-panel-meta-agent-chat__human-message-content">{props.text}</div>;
});
