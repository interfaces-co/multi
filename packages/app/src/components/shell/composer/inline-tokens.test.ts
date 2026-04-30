import { describe, expect, it } from "vitest";

import {
  parseComposerMarkdown,
  serializeComposerDocument,
  tokenRangesFromComposerMarkdown,
} from "./inline-tokens";

describe("composer inline token markdown", () => {
  it("round-trips plugin, skill, file, model, and tool links through serialization", () => {
    const markdown =
      "Use [plugin](plugin://github) [$tailwind](/Users/workgyver/.agents/skills/tailwind/SKILL.md) [README.md](file:///tmp/project/README.md) [GPT-5.4](model://codex/gpt-5.4) [shell](tool://terminal) now";

    expect(serializeComposerDocument(parseComposerMarkdown(markdown))).toBe(markdown);
    expect(serializeComposerDocument(markdown)).toBe(markdown);
  });

  it("keeps non-token markdown links as text", () => {
    const markdown = "Read [docs](https://example.com) before [tool](tool://search)";

    expect(parseComposerMarkdown(markdown)).toEqual([
      { type: "text", text: "Read [docs](https://example.com) before ", start: 0, end: 40 },
      {
        type: "token",
        start: 40,
        end: 61,
        token: {
          kind: "tool",
          label: "tool",
          markdown: "[tool](tool://search)",
          sourceUri: "tool://search",
          start: 40,
          end: 61,
        },
      },
    ]);
  });

  it("reports token ranges for mixed text", () => {
    expect(
      tokenRangesFromComposerMarkdown(
        "Open [settings](plugin://settings) with [$review](skill://review)",
      ).map((token) => ({
        kind: token.kind,
        label: token.label,
        markdown: token.markdown,
        sourceUri: token.sourceUri,
      })),
    ).toEqual([
      {
        kind: "plugin",
        label: "settings",
        markdown: "[settings](plugin://settings)",
        sourceUri: "plugin://settings",
      },
      {
        kind: "skill",
        label: "review",
        markdown: "[$review](skill://review)",
        sourceUri: "skill://review",
      },
    ]);
  });
});
