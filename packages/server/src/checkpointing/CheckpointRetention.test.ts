import { describe, expect, it } from "vitest";

import {
  getCheckpointRetainedTurnIds,
  retainMessagesAfterCheckpointRevert,
  retainTurnFactsAfterCheckpointRevert,
} from "./CheckpointRetention.ts";

describe("CheckpointRetention", () => {
  it("retains messages and turn facts at or before the target checkpoint count", () => {
    const retainedTurnIds = getCheckpointRetainedTurnIds(
      [
        { turnId: "turn-1", checkpointTurnCount: 1 },
        { turnId: "turn-2", checkpointTurnCount: 2 },
        { turnId: "turn-3", checkpointTurnCount: 3 },
      ],
      2,
    );

    expect([...retainedTurnIds]).toEqual(["turn-1", "turn-2"]);
    expect(
      retainMessagesAfterCheckpointRevert({
        retainedTurnIds,
        turnCount: 2,
        messageId: (message) => message.id,
        messages: [
          {
            id: "system",
            role: "system",
            turnId: null,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "user-1",
            role: "user",
            turnId: "turn-1",
            createdAt: "2026-01-01T00:00:01.000Z",
          },
          {
            id: "assistant-1",
            role: "assistant",
            turnId: "turn-1",
            createdAt: "2026-01-01T00:00:02.000Z",
          },
          {
            id: "user-3",
            role: "user",
            turnId: "turn-3",
            createdAt: "2026-01-01T00:00:03.000Z",
          },
        ],
      }).map((message) => message.id),
    ).toEqual(["system", "user-1", "assistant-1"]);
    expect(
      retainTurnFactsAfterCheckpointRevert(
        [
          { id: "global", turnId: null },
          { id: "kept", turnId: "turn-2" },
          { id: "removed", turnId: "turn-3" },
        ],
        retainedTurnIds,
      ).map((fact) => fact.id),
    ).toEqual(["global", "kept"]);
  });
});
