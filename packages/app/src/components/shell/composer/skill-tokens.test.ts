// @ts-nocheck
import { describe, expect, it } from "vitest";

import {
  applySkill,
  dropSkill,
  expandSkills,
  shiftSkills,
  snapSkillSelection,
  touchSkill,
} from "./skill-tokens";

function token(id: string, name: string) {
  return `[$${name}](skill://${encodeURIComponent(id)})`;
}

describe("skill-tokens", () => {
  it("drops a tracked skill when the edit touches the token", () => {
    const tailwind = token("/Users/workgyver/.agents/skills/tailwind", "tailwind");
    const prev = `${tailwind} hello`;
    const next = `${tailwind.slice(0, 5)}X${tailwind.slice(6)} hello`;
    const skills = [
      {
        id: "/Users/workgyver/.agents/skills/tailwind",
        name: "tailwind",
        start: 0,
        end: tailwind.length,
      },
    ];

    expect(shiftSkills(prev, next, skills)).toEqual([]);
  });

  it("shifts a tracked skill when text is inserted before it", () => {
    const tailwind = token("/Users/workgyver/.agents/skills/tailwind", "tailwind");
    const prev = `${tailwind} hello`;
    const next = `Use ${tailwind} hello`;
    const skills = [
      {
        id: "/Users/workgyver/.agents/skills/tailwind",
        name: "tailwind",
        start: 0,
        end: tailwind.length,
      },
    ];

    expect(shiftSkills(prev, next, skills)).toEqual([
      {
        id: "/Users/workgyver/.agents/skills/tailwind",
        name: "tailwind",
        start: 4,
        end: 4 + tailwind.length,
      },
    ]);
  });

  it("expands only explicitly tracked skills", () => {
    const tailwind = token("/Users/workgyver/.agents/skills/tailwind", "tailwind");
    const plain = token("/Users/workgyver/.agents/skills/plain", "plain");
    const text = `${tailwind} build\n${plain} text`;
    const skills = [
      {
        id: "/Users/workgyver/.agents/skills/tailwind",
        name: "tailwind",
        start: 0,
        end: tailwind.length,
      },
      {
        id: "/Users/workgyver/.agents/skills/plain",
        name: "plain",
        start: `${tailwind} build\n`.length,
        end: `${tailwind} build\n${plain}`.length,
      },
    ];

    expect(
      expandSkills(text, skills, [
        {
          id: "/Users/workgyver/.agents/skills/tailwind",
          name: "tailwind",
          description: "Tailwind CSS guidance",
          body: "Use Tailwind skill body.",
        },
      ]),
    ).toBe(`Use Tailwind skill body. build\n${plain} text`);
  });

  it("adds a tracked skill when inserted from the slash menu", () => {
    const tailwind = token("tailwind", "tailwind");
    expect(
      applySkill(
        "/tai",
        { query: "tai", start: 0, end: 4 },
        { id: "tailwind", name: "tailwind" },
        [],
      ),
    ).toEqual({
      value: `${tailwind} `,
      cursor: tailwind.length + 1,
      skills: [
        {
          id: "tailwind",
          name: "tailwind",
          start: 0,
          end: tailwind.length,
        },
      ],
    });
  });

  it("finds a token touched from the left or right edge", () => {
    const grillMe = token("grill-me", "grill-me");
    expect(
      touchSkill(
        `${grillMe} `,
        [
          {
            id: "grill-me",
            name: "grill-me",
            start: 0,
            end: grillMe.length,
          },
        ],
        grillMe.length,
        "left",
      ),
    ).toEqual({
      id: "grill-me",
      name: "grill-me",
      start: 0,
      end: grillMe.length,
    });

    expect(
      touchSkill(
        `${grillMe} `,
        [
          {
            id: "grill-me",
            name: "grill-me",
            start: 0,
            end: grillMe.length,
          },
        ],
        0,
        "right",
      ),
    ).toEqual({
      id: "grill-me",
      name: "grill-me",
      start: 0,
      end: grillMe.length,
    });
  });

  it("expands a selection that lands inside a tracked token", () => {
    const grillMe = token("grill-me", "grill-me");
    const text = `hello ${grillMe} world`;
    expect(
      snapSkillSelection(
        text,
        [
          {
            id: "grill-me",
            name: "grill-me",
            start: 6,
            end: 6 + grillMe.length,
          },
        ],
        9,
        9,
      ),
    ).toEqual({ start: 6, end: 6 + grillMe.length });
  });

  it("drops a tracked token and its trailing gap", () => {
    const tailwind = token("tailwind", "tailwind");
    expect(
      dropSkill(
        `${tailwind} hello`,
        [
          {
            id: "tailwind",
            name: "tailwind",
            start: 0,
            end: tailwind.length,
          },
        ],
        {
          id: "tailwind",
          name: "tailwind",
          start: 0,
          end: tailwind.length,
        },
      ),
    ).toEqual({
      value: "hello",
      cursor: 0,
      skills: [],
    });
  });
});
