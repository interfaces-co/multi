import { describe, expect, it } from "vitest";

import { formatProjectRelativePath } from "./file-path-display";

describe("formatProjectRelativePath", () => {
  it("formats absolute project paths from the project root", () => {
    expect(
      formatProjectRelativePath(
        "C:/Users/mike/dev-stuff/multi/packages/app/src/session-logic.ts:501",
        "C:/Users/mike/dev-stuff/multi",
      ),
    ).toBe("multi/packages/app/src/session-logic.ts:501");
  });

  it("prefixes relative paths with the project root label", () => {
    expect(
      formatProjectRelativePath(
        "packages/app/src/session-logic.ts:501",
        "C:/Users/mike/dev-stuff/multi",
      ),
    ).toBe("multi/packages/app/src/session-logic.ts:501");
  });

  it("keeps paths already rooted at the project label stable", () => {
    expect(
      formatProjectRelativePath(
        "multi/packages/app/src/session-logic.ts:501",
        "C:/Users/mike/dev-stuff/multi",
      ),
    ).toBe("multi/packages/app/src/session-logic.ts:501");
  });

  it("preserves columns when present", () => {
    expect(
      formatProjectRelativePath(
        "/C:/Users/mike/dev-stuff/multi/packages/app/src/session-logic.ts:501:9",
        "C:/Users/mike/dev-stuff/multi",
      ),
    ).toBe("multi/packages/app/src/session-logic.ts:501:9");
  });
});
