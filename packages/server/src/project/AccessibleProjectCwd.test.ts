import * as NodeServices from "@effect/platform-node/NodeServices";
import { it, describe, expect } from "@effect/vitest";
import { Effect, FileSystem, Layer, Path } from "effect";

import { coerceAccessibleProjectCwd, pickAccessibleDirectory } from "./AccessibleProjectCwd.ts";

const TestLayer = Layer.empty.pipe(Layer.provideMerge(NodeServices.layer));

const makeTempDir = Effect.fn("makeTempDir")(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.makeTempDirectoryScoped({
    prefix: "multi-accessible-project-cwd-",
  });
});

it.layer(TestLayer)("AccessibleProjectCwd", (it) => {
  describe("coerceAccessibleProjectCwd", () => {
    it.effect("keeps the requested cwd when it is an accessible directory", () =>
      Effect.gen(function* () {
        const cwd = yield* makeTempDir();

        const selected = yield* coerceAccessibleProjectCwd({
          operation: "test.accessible",
          candidates: [{ label: "project.projectRoot", cwd }],
          fallbackCwds: [{ label: "process.cwd", cwd: process.cwd() }],
        });

        expect(selected).toBe(cwd);
      }),
    );

    it.effect("falls back to the first accessible directory when the candidate is missing", () =>
      Effect.gen(function* () {
        const fallback = yield* makeTempDir();
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const missing = path.join(fallback, "missing");

        const selected = yield* pickAccessibleDirectory(missing, [fallback], "test.fallback");

        expect(selected).toBe(fallback);
        expect(yield* fileSystem.exists(missing)).toBe(false);
      }),
    );
  });
});
