import { describe, expect, it } from "vitest";

import { buildSlashMenuRows, type SlashItem } from "./slash-registry";

const items: SlashItem[] = [
  { id: "skill:one", kind: "skill", name: "one", pill: "Skill" },
  { id: "skill:two", kind: "skill", name: "two", pill: "Skill" },
  { id: "skill:three", kind: "skill", name: "three", pill: "Skill" },
  { id: "skill:four", kind: "skill", name: "four", pill: "Skill" },
  { id: "command:one", kind: "command", name: "new", pill: "Command", action: "new-chat" },
  { id: "mode:one", kind: "mode", name: "plan", pill: "Mode", action: "plan-mode" },
  { id: "tool:one", kind: "tool", name: "settings", pill: "Tool", action: "open-settings" },
];

const emptyRecents = {
  global: [],
  commands: [],
  skills: [],
};

describe("buildSlashMenuRows", () => {
  it("caps grouped slash sections and adds a show-more row", () => {
    const rows = buildSlashMenuRows(items, "", emptyRecents);

    expect(rows.map((row) => (row.kind === "header" ? row.label : row.kind))).toEqual([
      "Skills",
      "option",
      "option",
      "option",
      "more",
      "Commands",
      "option",
      "Modes",
      "option",
      "Tools",
      "option",
    ]);
    expect(rows.find((row) => row.kind === "more")).toMatchObject({
      kind: "more",
      key: "skills:more",
      count: 1,
    });
  });

  it("expands a requested group without changing Cursor section order", () => {
    const rows = buildSlashMenuRows(items, "", emptyRecents, new Set(["skills"]));

    expect(rows.filter((row) => row.kind === "more")).toEqual([]);
    expect(rows.filter((row) => row.kind === "header").map((row) => row.label)).toEqual([
      "Skills",
      "Commands",
      "Modes",
      "Tools",
    ]);
  });
});
