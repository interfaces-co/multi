import * as OS from "node:os";
import { Effect, FileSystem, Layer, Path } from "effect";

import {
  ProjectPaths,
  ProjectPathOutsideRootError,
  ProjectRootCreateFailedError,
  ProjectRootNotDirectoryError,
  ProjectRootNotExistsError,
  type ProjectPathsShape,
} from "./ProjectPaths.service.ts";

function toPosixRelativePath(input: string): string {
  return input.replaceAll("\\", "/");
}

function expandHomePath(input: string, path: Path.Path): string {
  if (input === "~") {
    return OS.homedir();
  }
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(OS.homedir(), input.slice(2));
  }
  return input;
}

export const makeProjectPaths = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const normalizeProjectRoot: ProjectPathsShape["normalizeProjectRoot"] = Effect.fn(
    "ProjectPaths.normalizeProjectRoot",
  )(function* (projectRoot, options) {
    const normalizedProjectRoot = path.resolve(expandHomePath(projectRoot.trim(), path));
    let projectStat = yield* fileSystem
      .stat(normalizedProjectRoot)
      .pipe(Effect.catch(() => Effect.succeed(null)));
    if (!projectStat && options?.createIfMissing) {
      yield* fileSystem.makeDirectory(normalizedProjectRoot, { recursive: true }).pipe(
        Effect.mapError(
          () =>
            new ProjectRootCreateFailedError({
              projectRoot,
              normalizedProjectRoot,
            }),
        ),
      );
      projectStat = yield* fileSystem
        .stat(normalizedProjectRoot)
        .pipe(Effect.catch(() => Effect.succeed(null)));
    }
    if (!projectStat) {
      return yield* new ProjectRootNotExistsError({
        projectRoot,
        normalizedProjectRoot,
      });
    }
    if (projectStat.type !== "Directory") {
      return yield* new ProjectRootNotDirectoryError({
        projectRoot,
        normalizedProjectRoot,
      });
    }
    return normalizedProjectRoot;
  });

  const resolveRelativePathWithinRoot: ProjectPathsShape["resolveRelativePathWithinRoot"] =
    Effect.fn("ProjectPaths.resolveRelativePathWithinRoot")(function* (input) {
      const normalizedInputPath = input.relativePath.trim();
      if (path.isAbsolute(normalizedInputPath)) {
        return yield* new ProjectPathOutsideRootError({
          projectRoot: input.projectRoot,
          relativePath: input.relativePath,
        });
      }

      const absolutePath = path.resolve(input.projectRoot, normalizedInputPath);
      const relativeToRoot = toPosixRelativePath(path.relative(input.projectRoot, absolutePath));
      if (
        relativeToRoot.length === 0 ||
        relativeToRoot === "." ||
        relativeToRoot.startsWith("../") ||
        relativeToRoot === ".." ||
        path.isAbsolute(relativeToRoot)
      ) {
        return yield* new ProjectPathOutsideRootError({
          projectRoot: input.projectRoot,
          relativePath: input.relativePath,
        });
      }

      return {
        absolutePath,
        relativePath: relativeToRoot,
      };
    });

  return {
    normalizeProjectRoot,
    resolveRelativePathWithinRoot,
  } satisfies ProjectPathsShape;
});

export const ProjectPathsLive = Layer.effect(ProjectPaths, makeProjectPaths);
