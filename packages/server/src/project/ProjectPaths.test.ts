import * as NodeServices from "@effect/platform-node/NodeServices";
import { it, describe, expect } from "@effect/vitest";
import { Effect, FileSystem, Layer, Path } from "effect";

import { ProjectPaths } from "./ProjectPaths.service.ts";
import { ProjectPathsLive } from "./ProjectPaths.ts";

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(ProjectPathsLive),
  Layer.provideMerge(NodeServices.layer),
);

const makeTempDir = Effect.fn("makeTempDir")(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.makeTempDirectoryScoped({
    prefix: "multi-project-paths-",
  });
});

const writeTextFile = Effect.fn("writeTextFile")(function* (
  cwd: string,
  relativePath: string,
  contents = "",
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const absolutePath = path.join(cwd, relativePath);
  yield* fileSystem
    .makeDirectory(path.dirname(absolutePath), { recursive: true })
    .pipe(Effect.orDie);
  yield* fileSystem.writeFileString(absolutePath, contents).pipe(Effect.orDie);
});

it.layer(TestLayer)("ProjectPathsLive", (it) => {
  describe("normalizeProjectRoot", () => {
    it.effect("resolves an existing directory", () =>
      Effect.gen(function* () {
        const projectPaths = yield* ProjectPaths;
        const cwd = yield* makeTempDir();

        const resolved = yield* projectPaths.normalizeProjectRoot(cwd);

        expect(resolved).toBe(cwd);
      }),
    );

    it.effect("rejects missing directories", () =>
      Effect.gen(function* () {
        const projectPaths = yield* ProjectPaths;
        const cwd = yield* makeTempDir();
        const path = yield* Path.Path;

        const error = yield* projectPaths
          .normalizeProjectRoot(path.join(cwd, "missing"))
          .pipe(Effect.flip);

        expect(error.message).toContain("Project root does not exist:");
      }),
    );

    it.effect("creates missing directories when createIfMissing is enabled", () =>
      Effect.gen(function* () {
        const projectPaths = yield* ProjectPaths;
        const fileSystem = yield* FileSystem.FileSystem;
        const cwd = yield* makeTempDir();
        const path = yield* Path.Path;
        const missingPath = path.join(cwd, "nested", "new-project");

        const resolved = yield* projectPaths.normalizeProjectRoot(missingPath, {
          createIfMissing: true,
        });
        const stat = yield* fileSystem.stat(resolved);

        expect(resolved).toBe(missingPath);
        expect(stat.type).toBe("Directory");
      }),
    );

    it.effect("rejects file paths", () =>
      Effect.gen(function* () {
        const projectPaths = yield* ProjectPaths;
        const cwd = yield* makeTempDir();
        const path = yield* Path.Path;
        const filePath = path.join(cwd, "README.md");
        yield* writeTextFile(cwd, "README.md", "# hi\n");

        const error = yield* projectPaths.normalizeProjectRoot(filePath).pipe(Effect.flip);

        expect(error.message).toContain("Project root is not a directory:");
      }),
    );
  });

  describe("resolveRelativePathWithinRoot", () => {
    it.effect("resolves relative paths inside the project root", () =>
      Effect.gen(function* () {
        const projectPaths = yield* ProjectPaths;
        const cwd = yield* makeTempDir();
        const path = yield* Path.Path;

        const resolved = yield* projectPaths.resolveRelativePathWithinRoot({
          projectRoot: cwd,
          relativePath: "plans/effect-rpc.md",
        });

        expect(resolved).toEqual({
          absolutePath: path.join(cwd, "plans/effect-rpc.md"),
          relativePath: "plans/effect-rpc.md",
        });
      }),
    );

    it.effect("rejects paths that escape the project root", () =>
      Effect.gen(function* () {
        const projectPaths = yield* ProjectPaths;
        const cwd = yield* makeTempDir();

        const error = yield* projectPaths
          .resolveRelativePathWithinRoot({
            projectRoot: cwd,
            relativePath: "../escape.md",
          })
          .pipe(Effect.flip);

        expect(error.message).toContain(
          "Project file path must be relative to the project root: ../escape.md",
        );
      }),
    );
  });
});
