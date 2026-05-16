import * as NodeHttp from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { NetService } from "@multi/shared/Net";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as CliError from "effect/unstable/cli/CliError";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as TestConsole from "effect/testing/TestConsole";
import { Command } from "effect/unstable/cli";

import { cli } from "../../src/cli.ts";
import { deriveServerPaths, ServerConfig, type ServerConfigShape } from "../../src/config.ts";
import { OrchestrationEngineService } from "../../src/orchestration/OrchestrationEngine.service.ts";
import { ThreadProjection } from "../../src/orchestration/ThreadProjection.service.ts";
import { OrchestrationLayerLive } from "../../src/orchestration/runtime-layer.ts";
import {
  orchestrationDispatchRouteLayer,
  orchestrationSnapshotRouteLayer,
} from "../../src/orchestration/http.ts";
import { layerConfig as SqlitePersistenceLayerLive } from "../../src/persistence/Sqlite.ts";
import { RepositoryIdentityResolverLive } from "../../src/project/RepositoryIdentityResolver.ts";
import {
  makePersistedServerRuntimeState,
  persistServerRuntimeState,
} from "../../src/server-runtime-state.ts";
import { ProjectPathsLive } from "../../src/project/ProjectPaths.ts";
import { ServerSecretStoreLive } from "../../src/auth/ServerSecretStore.ts";
import { ServerAuthLive } from "../../src/auth/ServerAuth.ts";

const CliRuntimeLayer = Layer.mergeAll(NodeServices.layer, NetService.layer);

const runCli = (args: ReadonlyArray<string>) => Command.runWith(cli, { version: "0.0.0" })(args);
const runCliWithRuntime = (args: ReadonlyArray<string>) =>
  runCli(args).pipe(Effect.provide(CliRuntimeLayer));

const captureStdout = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const result = yield* effect;
    const output =
      (yield* TestConsole.logLines).findLast((line): line is string => typeof line === "string") ??
      "";
    return { result, output };
  }).pipe(Effect.provide(Layer.mergeAll(CliRuntimeLayer, TestConsole.layer)));

const makeCliTestServerConfig = (baseDir: string, devUrl?: URL) =>
  Effect.gen(function* () {
    const derivedPaths = yield* deriveServerPaths(baseDir, devUrl);
    return {
      logLevel: "Info",
      traceMinLevel: "Info",
      traceTimingEnabled: true,
      traceBatchWindowMs: 200,
      traceMaxBytes: 10 * 1024 * 1024,
      traceMaxFiles: 10,
      otlpTracesUrl: undefined,
      otlpMetricsUrl: undefined,
      otlpExportIntervalMs: 10_000,
      otlpServiceName: "multi-server",
      mode: "web",
      port: 0,
      host: "127.0.0.1",
      cwd: process.cwd(),
      baseDir,
      ...derivedPaths,
      staticDir: undefined,
      devUrl,
      noBrowser: true,
      startupPresentation: "browser",
      desktopBootstrapToken: undefined,
      autoBootstrapProjectFromCwd: false,
      logWebSocketEvents: false,
    } satisfies ServerConfigShape;
  });

const makeProjectPersistenceLayer = (config: ServerConfigShape) =>
  Layer.mergeAll(
    OrchestrationLayerLive.pipe(
      Layer.provideMerge(RepositoryIdentityResolverLive),
      Layer.provideMerge(SqlitePersistenceLayerLive),
    ),
    ProjectPathsLive,
  ).pipe(
    Layer.provideMerge(NodeServices.layer),
    Layer.provide(Layer.succeed(ServerConfig, config)),
  );

const readPersistedSnapshot = (baseDir: string, devUrl?: URL) =>
  Effect.gen(function* () {
    const config = yield* makeCliTestServerConfig(baseDir, devUrl);
    return yield* Effect.gen(function* () {
      const threadProjection = yield* ThreadProjection;
      return yield* threadProjection.getSnapshot();
    }).pipe(Effect.provide(makeProjectPersistenceLayer(config)));
  });

const withLiveProjectCliServer = <A, E, R>(baseDir: string, run: () => Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const config = yield* makeCliTestServerConfig(baseDir);
    const routesLayer = Layer.mergeAll(
      orchestrationSnapshotRouteLayer,
      orchestrationDispatchRouteLayer,
    );
    const appLayer = HttpRouter.serve(routesLayer, {
      disableListenLog: true,
      disableLogger: true,
    }).pipe(
      Layer.provideMerge(
        ServerAuthLive.pipe(
          Layer.provideMerge(SqlitePersistenceLayerLive),
          Layer.provide(ServerSecretStoreLive),
        ),
      ),
      Layer.provideMerge(makeProjectPersistenceLayer(config)),
      Layer.provideMerge(
        NodeHttpServer.layer(NodeHttp.createServer, {
          host: "127.0.0.1",
          port: 0,
        }),
      ),
      Layer.provideMerge(NodeServices.layer),
      Layer.provide(Layer.succeed(ServerConfig, config)),
    );

    return yield* Effect.scoped(
      Effect.gen(function* () {
        const server = yield* HttpServer.HttpServer;
        const address = server.address;
        if (typeof address === "string" || !("port" in address)) {
          assert.fail(`Expected TCP address, got ${address}`);
        }
        yield* persistServerRuntimeState({
          path: config.serverRuntimeStatePath,
          state: makePersistedServerRuntimeState({
            config,
            port: address.port,
          }),
        });
        return yield* run();
      }).pipe(Effect.provide(Layer.mergeAll(appLayer, NodeServices.layer))),
    );
  });

it.layer(NodeServices.layer)("cli log-level parsing", (it) => {
  it.effect("accepts the built-in lowercase log-level flag values", () =>
    runCliWithRuntime(["--log-level", "debug", "--version"]),
  );

  it.effect("accepts canonical --no-<flag> boolean negation", () =>
    runCliWithRuntime(["--no-log-websocket-events", "--version"]),
  );

  it.effect("rejects invalid log-level casing before launching the server", () =>
    Effect.gen(function* () {
      const error = yield* runCliWithRuntime(["--log-level", "Debug"]).pipe(Effect.flip);

      if (!CliError.isCliError(error)) {
        assert.fail(`Expected CliError, got ${String(error)}`);
      }
      if (error._tag !== "InvalidValue") {
        assert.fail(`Expected InvalidValue, got ${error._tag}`);
      }
      assert.equal(error.option, "log-level");
      assert.equal(error.value, "Debug");
    }),
  );

  it.effect("executes auth pairing subcommands and redacts secrets from list output", () =>
    Effect.gen(function* () {
      const baseDir = mkdtempSync(join(tmpdir(), "multi-cli-auth-pairing-test-"));

      const createdOutput = yield* captureStdout(
        runCli(["auth", "pairing", "create", "--base-dir", baseDir, "--json"]),
      );
      const created = JSON.parse(createdOutput.output) as {
        readonly id: string;
        readonly credential: string;
      };
      const listedOutput = yield* captureStdout(
        runCli(["auth", "pairing", "list", "--base-dir", baseDir, "--json"]),
      );
      const listed = JSON.parse(listedOutput.output) as ReadonlyArray<{
        readonly id: string;
        readonly credential?: string;
      }>;

      assert.equal(typeof created.id, "string");
      assert.equal(typeof created.credential, "string");
      assert.equal(created.credential.length > 0, true);
      assert.equal(listed.length, 1);
      assert.equal(listed[0]?.id, created.id);
      assert.equal("credential" in (listed[0] ?? {}), false);
    }),
  );

  it.effect("executes auth session subcommands and redacts secrets from list output", () =>
    Effect.gen(function* () {
      const baseDir = mkdtempSync(join(tmpdir(), "multi-cli-auth-session-test-"));

      const issuedOutput = yield* captureStdout(
        runCli(["auth", "session", "issue", "--base-dir", baseDir, "--json"]),
      );
      const issued = JSON.parse(issuedOutput.output) as {
        readonly sessionId: string;
        readonly token: string;
        readonly role: string;
      };
      const listedOutput = yield* captureStdout(
        runCli(["auth", "session", "list", "--base-dir", baseDir, "--json"]),
      );
      const listed = JSON.parse(listedOutput.output) as ReadonlyArray<{
        readonly sessionId: string;
        readonly token?: string;
        readonly role: string;
      }>;

      assert.equal(typeof issued.sessionId, "string");
      assert.equal(typeof issued.token, "string");
      assert.equal(issued.role, "owner");
      assert.equal(listed.length, 1);
      assert.equal(listed[0]?.sessionId, issued.sessionId);
      assert.equal(listed[0]?.role, "owner");
      assert.equal("token" in (listed[0] ?? {}), false);
    }),
  );

  it.effect("rejects invalid ttl values before running auth commands", () =>
    Effect.gen(function* () {
      const error = yield* runCliWithRuntime(["auth", "pairing", "create", "--ttl", "soon"]).pipe(
        Effect.flip,
      );

      if (!CliError.isCliError(error)) {
        assert.fail(`Expected CliError, got ${String(error)}`);
      }
      if (error._tag !== "ShowHelp") {
        assert.fail(`Expected ShowHelp, got ${error._tag}`);
      }
      assert.deepEqual(error.commandPath, ["multi", "auth", "pairing", "create"]);
      const ttlError = error.errors[0] as CliError.CliError | undefined;
      if (!ttlError || ttlError._tag !== "InvalidValue") {
        assert.fail(`Expected InvalidValue, got ${String(ttlError?._tag)}`);
      }
      assert.equal(ttlError.option, "ttl");
      assert.equal(ttlError.value, "soon");
      assert.isTrue(ttlError.message.includes("Invalid duration"));
      assert.isTrue(ttlError.message.includes("5m, 1h, 30d, or 15 minutes"));
    }),
  );

  it.effect("adds, renames, and removes projects offline through the orchestration engine", () =>
    Effect.gen(function* () {
      const baseDir = mkdtempSync(join(tmpdir(), "multi-cli-projects-offline-test-"));
      const projectRoot = mkdtempSync(join(tmpdir(), "multi-cli-projects-project-"));
      const relocatedProjectRoot = mkdtempSync(
        join(tmpdir(), "multi-cli-projects-relocated-project-"),
      );

      yield* runCliWithRuntime([
        "project",
        "add",
        projectRoot,
        "--title",
        "Alpha",
        "--base-dir",
        baseDir,
      ]);
      const afterAdd = yield* readPersistedSnapshot(baseDir);
      const addedProject = afterAdd.projects.find(
        (project) => project.projectRoot === projectRoot && project.deletedAt === null,
      );
      assert.isTrue(addedProject !== undefined);
      assert.equal(addedProject?.title, "Alpha");

      yield* runCliWithRuntime(["project", "rename", projectRoot, "Beta", "--base-dir", baseDir]);
      const afterRename = yield* readPersistedSnapshot(baseDir);
      const renamedProject = afterRename.projects.find(
        (project) => project.id === addedProject?.id,
      );
      assert.equal(renamedProject?.title, "Beta");
      assert.equal(renamedProject?.deletedAt, null);

      yield* runCliWithRuntime([
        "project",
        "relocate",
        projectRoot,
        relocatedProjectRoot,
        "--base-dir",
        baseDir,
      ]);
      const afterRelocate = yield* readPersistedSnapshot(baseDir);
      const relocatedProject = afterRelocate.projects.find(
        (project) => project.id === addedProject?.id,
      );
      assert.equal(relocatedProject?.projectRoot, relocatedProjectRoot);
      assert.equal(relocatedProject?.title, "Beta");
      assert.equal(relocatedProject?.deletedAt, null);

      yield* runCliWithRuntime([
        "project",
        "remove",
        addedProject?.id ?? "",
        "--base-dir",
        baseDir,
      ]);
      const afterRemove = yield* readPersistedSnapshot(baseDir);
      const removedProject = afterRemove.projects.find(
        (project) => project.id === addedProject?.id,
      );
      assert.isTrue((removedProject?.deletedAt ?? null) !== null);
    }),
  );

  it.effect("routes project commands through a running server when runtime state is present", () =>
    Effect.gen(function* () {
      const baseDir = mkdtempSync(join(tmpdir(), "multi-cli-projects-live-test-"));
      const projectRoot = mkdtempSync(join(tmpdir(), "multi-cli-projects-live-project-"));

      yield* withLiveProjectCliServer(baseDir, () =>
        Effect.gen(function* () {
          yield* runCliWithRuntime([
            "project",
            "add",
            projectRoot,
            "--title",
            "Live Project",
            "--base-dir",
            baseDir,
          ]);
          const orchestrationEngine = yield* OrchestrationEngineService;
          const readModel = yield* orchestrationEngine.getReadModel();
          const addedProject = readModel.projects.find(
            (project) => project.projectRoot === projectRoot && project.deletedAt === null,
          );
          assert.isTrue(addedProject !== undefined);
          assert.equal(addedProject?.title, "Live Project");
        }),
      );
    }),
  );

  it.effect("relocates a project by stale project root when the old path is missing", () =>
    Effect.gen(function* () {
      const baseDir = mkdtempSync(join(tmpdir(), "multi-cli-projects-stale-root-test-"));
      const projectRoot = mkdtempSync(join(tmpdir(), "multi-cli-projects-stale-root-old-"));
      const relocatedProjectRoot = mkdtempSync(
        join(tmpdir(), "multi-cli-projects-stale-root-new-"),
      );
      const missingProjectRoot = join(baseDir, "missing-project-root");

      yield* runCliWithRuntime([
        "project",
        "add",
        projectRoot,
        "--title",
        "Stale Root",
        "--base-dir",
        baseDir,
      ]);
      const afterAdd = yield* readPersistedSnapshot(baseDir);
      const addedProject = afterAdd.projects.find(
        (project) => project.projectRoot === projectRoot && project.deletedAt === null,
      );
      assert.isTrue(addedProject !== undefined);

      const config = yield* makeCliTestServerConfig(baseDir);
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`
          UPDATE projection_projects
          SET project_root = ${missingProjectRoot}
          WHERE project_id = ${addedProject?.id ?? ""}
        `;
      }).pipe(Effect.provide(makeProjectPersistenceLayer(config)));

      yield* runCliWithRuntime([
        "project",
        "relocate",
        missingProjectRoot,
        relocatedProjectRoot,
        "--base-dir",
        baseDir,
      ]);

      const afterRelocate = yield* readPersistedSnapshot(baseDir);
      const relocatedProject = afterRelocate.projects.find(
        (project) => project.id === addedProject?.id,
      );
      assert.equal(relocatedProject?.projectRoot, relocatedProjectRoot);
    }),
  );

  it.effect("targets dev state when project commands receive dev-url", () =>
    Effect.gen(function* () {
      const projectRoot = mkdtempSync(join(tmpdir(), "multi-cli-projects-dev-url-project-"));
      const baseDir = mkdtempSync(join(tmpdir(), "multi-cli-projects-dev-url-test-"));
      const devUrl = new URL("http://127.0.0.1:5173");

      yield* runCliWithRuntime([
        "project",
        "add",
        projectRoot,
        "--title",
        "Dev Project",
        "--base-dir",
        baseDir,
        "--dev-url",
        devUrl.href,
      ]);

      const devSnapshot = yield* readPersistedSnapshot(baseDir, devUrl);
      const userdataSnapshot = yield* readPersistedSnapshot(baseDir);
      assert.equal(
        devSnapshot.projects.some(
          (project) =>
            project.projectRoot === projectRoot &&
            project.title === "Dev Project" &&
            project.deletedAt === null,
        ),
        true,
      );
      assert.equal(
        userdataSnapshot.projects.some((project) => project.projectRoot === projectRoot),
        false,
      );
    }),
  );
});
