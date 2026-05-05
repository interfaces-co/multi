import { statSync } from "node:fs";
import path from "node:path";

import { Effect } from "effect";
import type { ProjectId, ThreadId } from "@multi/contracts";

export interface ProjectCwdCandidate {
  readonly label: string;
  readonly cwd: string | null | undefined;
}

export interface CoerceAccessibleProjectCwdInput {
  readonly operation: string;
  readonly candidates: ReadonlyArray<ProjectCwdCandidate>;
  readonly fallbackCwds?: ReadonlyArray<ProjectCwdCandidate>;
  readonly threadId?: ThreadId | string;
  readonly projectId?: ProjectId | string;
}

interface NormalizedCandidate {
  readonly label: string;
  readonly cwd: string;
}

function normalizeCandidates(
  candidates: ReadonlyArray<ProjectCwdCandidate>,
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

export const coerceAccessibleProjectCwd = Effect.fn("coerceAccessibleProjectCwd")(function* (
  input: CoerceAccessibleProjectCwdInput,
): Effect.fn.Return<string | undefined> {
  const candidates = normalizeCandidates([...input.candidates, ...(input.fallbackCwds ?? [])]);
  const skipped: Array<{ readonly label: string; readonly cwd: string; readonly reason: string }> =
    [];

  for (const [index, candidate] of candidates.entries()) {
    const failure = directoryFailure(candidate.cwd);
    if (!failure) {
      if (index > 0) {
        yield* Effect.logWarning("project cwd fallback selected", {
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

  yield* Effect.logWarning("project cwd unavailable", {
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
  operation = "project.pickAccessibleDirectory",
): Effect.Effect<string | undefined> =>
  coerceAccessibleProjectCwd({
    operation,
    candidates: [{ label: "candidate", cwd: candidate }],
    fallbackCwds: fallbacks.map((cwd, index) => ({
      label: `fallback.${index}`,
      cwd,
    })),
  });

export const coerceThreadProjectCwd = Effect.fn("coerceThreadProjectCwd")(function* (input: {
  readonly operation: string;
  readonly thread: {
    readonly id?: ThreadId | string;
    readonly projectId: ProjectId;
    readonly worktreePath: string | null;
  };
  readonly projects: ReadonlyArray<{
    readonly id: ProjectId;
    readonly projectRoot: string;
  }>;
  readonly fallbackCwds: ReadonlyArray<ProjectCwdCandidate>;
}): Effect.fn.Return<string | undefined> {
  const project = input.projects.find((entry) => entry.id === input.thread.projectId);
  return yield* coerceAccessibleProjectCwd({
    operation: input.operation,
    candidates: [
      { label: "thread.worktreePath", cwd: input.thread.worktreePath },
      { label: "project.projectRoot", cwd: project?.projectRoot },
    ],
    fallbackCwds: input.fallbackCwds,
    ...(input.thread.id !== undefined ? { threadId: input.thread.id } : {}),
    projectId: input.thread.projectId,
  });
});
