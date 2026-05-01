import { statSync } from "node:fs";
import path from "node:path";

import { Effect } from "effect";
import type { ProjectId, ThreadId } from "@multi/contracts";

export interface WorkspaceCwdCandidate {
  readonly label: string;
  readonly cwd: string | null | undefined;
}

export interface CoerceAccessibleWorkspaceCwdInput {
  readonly operation: string;
  readonly candidates: ReadonlyArray<WorkspaceCwdCandidate>;
  readonly fallbackCwds?: ReadonlyArray<WorkspaceCwdCandidate>;
  readonly threadId?: ThreadId | string;
  readonly projectId?: ProjectId | string;
}

interface NormalizedCandidate {
  readonly label: string;
  readonly cwd: string;
}

function normalizeCandidates(
  candidates: ReadonlyArray<WorkspaceCwdCandidate>,
): ReadonlyArray<NormalizedCandidate> {
  const normalized: NormalizedCandidate[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const trimmed = candidate.cwd?.trim();
    if (!trimmed) {
      continue;
    }

    const cwd = path.resolve(trimmed);
    if (seen.has(cwd)) {
      continue;
    }
    seen.add(cwd);
    normalized.push({
      label: candidate.label,
      cwd,
    });
  }

  return normalized;
}

function directoryFailure(cwd: string): string | undefined {
  try {
    const stat = statSync(cwd);
    return stat.isDirectory() ? undefined : "Path is not a directory.";
  } catch (cause) {
    return cause instanceof Error ? cause.message : "Directory is not accessible.";
  }
}

export const coerceAccessibleWorkspaceCwd = Effect.fn("coerceAccessibleWorkspaceCwd")(function* (
  input: CoerceAccessibleWorkspaceCwdInput,
): Effect.fn.Return<string | undefined> {
  const candidates = normalizeCandidates([...input.candidates, ...(input.fallbackCwds ?? [])]);
  const skipped: Array<{ readonly label: string; readonly cwd: string; readonly reason: string }> =
    [];

  for (const [index, candidate] of candidates.entries()) {
    const failure = directoryFailure(candidate.cwd);
    if (!failure) {
      if (index > 0) {
        yield* Effect.logWarning("workspace cwd fallback selected", {
          operation: input.operation,
          selectedLabel: candidate.label,
          selectedCwd: candidate.cwd,
          skipped,
          ...(input.threadId !== undefined ? { threadId: String(input.threadId) } : {}),
          ...(input.projectId !== undefined ? { projectId: String(input.projectId) } : {}),
        });
      }
      return candidate.cwd;
    }

    skipped.push({
      label: candidate.label,
      cwd: candidate.cwd,
      reason: failure,
    });
  }

  yield* Effect.logWarning("workspace cwd unavailable", {
    operation: input.operation,
    skipped,
    ...(input.threadId !== undefined ? { threadId: String(input.threadId) } : {}),
    ...(input.projectId !== undefined ? { projectId: String(input.projectId) } : {}),
  });
  return undefined;
});

export const pickAccessibleDirectory = (
  candidate: string | undefined,
  fallbacks: readonly string[],
  operation = "workspace.pickAccessibleDirectory",
): Effect.Effect<string | undefined> =>
  coerceAccessibleWorkspaceCwd({
    operation,
    candidates: [{ label: "candidate", cwd: candidate }],
    fallbackCwds: fallbacks.map((cwd, index) => ({
      label: `fallback.${index}`,
      cwd,
    })),
  });

export const coerceThreadWorkspaceCwd = Effect.fn("coerceThreadWorkspaceCwd")(function* (input: {
  readonly operation: string;
  readonly thread: {
    readonly id?: ThreadId | string;
    readonly projectId: ProjectId;
    readonly worktreePath: string | null;
  };
  readonly projects: ReadonlyArray<{
    readonly id: ProjectId;
    readonly workspaceRoot: string;
  }>;
  readonly fallbackCwds: ReadonlyArray<WorkspaceCwdCandidate>;
}): Effect.fn.Return<string | undefined> {
  const project = input.projects.find((entry) => entry.id === input.thread.projectId);
  return yield* coerceAccessibleWorkspaceCwd({
    operation: input.operation,
    candidates: [
      { label: "thread.worktreePath", cwd: input.thread.worktreePath },
      { label: "project.workspaceRoot", cwd: project?.workspaceRoot },
    ],
    fallbackCwds: input.fallbackCwds,
    ...(input.thread.id !== undefined ? { threadId: input.thread.id } : {}),
    projectId: input.thread.projectId,
  });
});
