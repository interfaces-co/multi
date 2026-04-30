export type ComposerInlineTokenKind = "file" | "plugin" | "skill" | "tool" | "model";

export type ComposerInlineToken = {
  kind: ComposerInlineTokenKind;
  label: string;
  markdown: string;
  sourceUri: string;
  metadata?: Record<string, string>;
  start: number;
  end: number;
};

export type ComposerDocumentSegment =
  | {
      type: "text";
      text: string;
      start: number;
      end: number;
    }
  | {
      type: "token";
      token: ComposerInlineToken;
      start: number;
      end: number;
    };

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)]\(([^)\s]+)\)/g;

function tokenKindForUri(uri: string, label: string): ComposerInlineTokenKind | null {
  if (uri.startsWith("plugin://")) return "plugin";
  if (uri.startsWith("tool://")) return "tool";
  if (uri.startsWith("model://")) return "model";
  if (uri.startsWith("file://") || uri.startsWith("vscode-file://")) return "file";
  if (label.startsWith("$")) return "skill";
  return null;
}

function visibleLabel(label: string): string {
  if (label.startsWith("@") || label.startsWith("$")) return label.slice(1);
  return label;
}

function pushText(
  segments: ComposerDocumentSegment[],
  text: string,
  start: number,
  end: number,
): void {
  if (!text) return;
  const prev = segments[segments.length - 1];
  if (prev?.type === "text") {
    segments[segments.length - 1] = {
      ...prev,
      text: `${prev.text}${text}`,
      end,
    };
    return;
  }
  segments.push({ type: "text", text, start, end });
}

export function parseComposerMarkdown(input: string): ComposerDocumentSegment[] {
  const segments: ComposerDocumentSegment[] = [];
  let cursor = 0;

  for (const match of input.matchAll(MARKDOWN_LINK_PATTERN)) {
    const start = match.index ?? 0;
    const markdown = match[0];
    const rawLabel = match[1] ?? "";
    const sourceUri = match[2] ?? "";
    const kind = tokenKindForUri(sourceUri, rawLabel);

    if (kind === null) {
      continue;
    }

    pushText(segments, input.slice(cursor, start), cursor, start);
    segments.push({
      type: "token",
      start,
      end: start + markdown.length,
      token: {
        kind,
        label: visibleLabel(rawLabel),
        markdown,
        sourceUri,
        start,
        end: start + markdown.length,
      },
    });
    cursor = start + markdown.length;
  }

  pushText(segments, input.slice(cursor), cursor, input.length);
  return segments.length > 0
    ? segments
    : [{ type: "text", text: input, start: 0, end: input.length }];
}

export function serializeComposerDocument(
  input: string | ReadonlyArray<ComposerDocumentSegment>,
): string {
  if (typeof input === "string") {
    return parseComposerMarkdown(input)
      .map((segment) => (segment.type === "token" ? segment.token.markdown : segment.text))
      .join("");
  }

  return input
    .map((segment) => (segment.type === "token" ? segment.token.markdown : segment.text))
    .join("");
}

export function tokenRangesFromComposerMarkdown(input: string): ComposerInlineToken[] {
  return parseComposerMarkdown(input).flatMap((segment) =>
    segment.type === "token" ? [segment.token] : [],
  );
}
