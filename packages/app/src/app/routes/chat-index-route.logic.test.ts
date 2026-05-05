import { describe, expect, it } from "vitest";
import { EnvironmentId, ProjectId, ThreadId } from "@multi/contracts";

import { resolveInitialChatTarget } from "./chat-index-route.logic";

const ENVIRONMENT_ID = EnvironmentId.make("environment-local");
const OTHER_ENVIRONMENT_ID = EnvironmentId.make("environment-remote");
const PROJECT_ID = ProjectId.make("project-1");
const OTHER_PROJECT_ID = ProjectId.make("project-2");
const THREAD_ID = ThreadId.make("thread-1");
const OTHER_THREAD_ID = ThreadId.make("thread-2");
const DRAFT_ID = "draft-1";

describe("resolveInitialChatTarget", () => {
  it("returns null before bootstrap completes", () => {
    expect(
      resolveInitialChatTarget({
        activeEnvironmentId: ENVIRONMENT_ID,
        bootstrapComplete: false,
        storedProjectCwd: null,
        projects: [],
        threads: [],
        drafts: [],
      }),
    ).toBeNull();
  });

  it("prefers the most recent existing thread in the stored project", () => {
    expect(
      resolveInitialChatTarget({
        activeEnvironmentId: ENVIRONMENT_ID,
        bootstrapComplete: true,
        storedProjectCwd: "/repo/a",
        projects: [
          { id: PROJECT_ID, environmentId: ENVIRONMENT_ID, cwd: "/repo/a" },
          { id: OTHER_PROJECT_ID, environmentId: ENVIRONMENT_ID, cwd: "/repo/b" },
        ],
        threads: [
          {
            id: THREAD_ID,
            environmentId: ENVIRONMENT_ID,
            projectId: PROJECT_ID,
            worktreePath: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:10:00.000Z",
            archivedAt: null,
          },
          {
            id: OTHER_THREAD_ID,
            environmentId: ENVIRONMENT_ID,
            projectId: OTHER_PROJECT_ID,
            worktreePath: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:20:00.000Z",
            archivedAt: null,
          },
        ],
        drafts: [],
      }),
    ).toEqual({
      kind: "server",
      environmentId: ENVIRONMENT_ID,
      threadId: THREAD_ID,
    });
  });

  it("falls back to the most recent thread when no stored project matches", () => {
    expect(
      resolveInitialChatTarget({
        activeEnvironmentId: ENVIRONMENT_ID,
        bootstrapComplete: true,
        storedProjectCwd: "/repo/missing",
        projects: [{ id: PROJECT_ID, environmentId: ENVIRONMENT_ID, cwd: "/repo/a" }],
        threads: [
          {
            id: THREAD_ID,
            environmentId: ENVIRONMENT_ID,
            projectId: PROJECT_ID,
            worktreePath: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:10:00.000Z",
            archivedAt: null,
          },
          {
            id: OTHER_THREAD_ID,
            environmentId: ENVIRONMENT_ID,
            projectId: PROJECT_ID,
            worktreePath: "/repo/z",
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:20:00.000Z",
            archivedAt: null,
          },
        ],
        drafts: [],
      }),
    ).toEqual({
      kind: "server",
      environmentId: ENVIRONMENT_ID,
      threadId: OTHER_THREAD_ID,
    });
  });

  it("considers persisted drafts when they are the only active items", () => {
    expect(
      resolveInitialChatTarget({
        activeEnvironmentId: ENVIRONMENT_ID,
        bootstrapComplete: true,
        storedProjectCwd: null,
        projects: [{ id: PROJECT_ID, environmentId: ENVIRONMENT_ID, cwd: "/repo/a" }],
        threads: [],
        drafts: [
          {
            draftId: DRAFT_ID,
            environmentId: ENVIRONMENT_ID,
            projectId: PROJECT_ID,
            worktreePath: null,
            createdAt: "2026-05-01T00:10:00.000Z",
            promotedTo: null,
          },
        ],
      }),
    ).toEqual({
      kind: "draft",
      draftId: DRAFT_ID,
    });
  });

  it("ignores archived threads, promoted drafts, and foreign environments", () => {
    expect(
      resolveInitialChatTarget({
        activeEnvironmentId: ENVIRONMENT_ID,
        bootstrapComplete: true,
        storedProjectCwd: null,
        projects: [
          { id: PROJECT_ID, environmentId: ENVIRONMENT_ID, cwd: "/repo/a" },
          { id: OTHER_PROJECT_ID, environmentId: OTHER_ENVIRONMENT_ID, cwd: "/repo/b" },
        ],
        threads: [
          {
            id: THREAD_ID,
            environmentId: ENVIRONMENT_ID,
            projectId: PROJECT_ID,
            worktreePath: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:10:00.000Z",
            archivedAt: "2026-05-01T00:20:00.000Z",
          },
          {
            id: OTHER_THREAD_ID,
            environmentId: OTHER_ENVIRONMENT_ID,
            projectId: OTHER_PROJECT_ID,
            worktreePath: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:20:00.000Z",
            archivedAt: null,
          },
        ],
        drafts: [
          {
            draftId: DRAFT_ID,
            environmentId: ENVIRONMENT_ID,
            projectId: PROJECT_ID,
            worktreePath: null,
            createdAt: "2026-05-01T00:10:00.000Z",
            promotedTo: {
              environmentId: ENVIRONMENT_ID,
              threadId: THREAD_ID,
            },
          },
        ],
      }),
    ).toBeNull();
  });
});
