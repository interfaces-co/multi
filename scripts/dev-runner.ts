#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { resolve } from "node:path";

const BASE_SERVER_PORT = 13773;
const BASE_WEB_PORT = 5733;
const MAX_HASH_OFFSET = 3000;
const MAX_PORT = 65535;
const DESKTOP_DEV_LOOPBACK_HOST = "127.0.0.1";
const DEV_PORT_PROBE_HOSTS = ["127.0.0.1", "0.0.0.0", "::1", "::"] as const;

const MODE_ARGS = {
  dev: ["run", "dev", "--filter=@multi/desktop"],
  "dev:server": ["run", "dev", "--filter=usemulti"],
  "dev:web": ["run", "dev", "--filter=usemulti", "--filter=@multi/web"],
} as const;

type DevMode = keyof typeof MODE_ARGS;
const DEV_RUNNER_MODES = Object.keys(MODE_ARGS) as DevMode[];

function hashString(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export function resolveOffset(config: {
  readonly portOffset: number | undefined;
  readonly devInstance: string | undefined;
}): { readonly offset: number; readonly source: string } {
  if (config.portOffset !== undefined) {
    if (config.portOffset < 0) {
      throw new Error(`Invalid MULTI_PORT_OFFSET: ${config.portOffset}`);
    }
    return {
      offset: config.portOffset,
      source: `MULTI_PORT_OFFSET=${config.portOffset}`,
    };
  }

  const seed = config.devInstance?.trim();
  if (!seed) {
    return { offset: 0, source: "default ports" };
  }

  if (/^\d+$/.test(seed)) {
    return { offset: Number(seed), source: `numeric MULTI_DEV_INSTANCE=${seed}` };
  }

  const offset = (hashString(seed) % MAX_HASH_OFFSET) + 1;
  return { offset, source: `hashed MULTI_DEV_INSTANCE=${seed}` };
}

function canListenOnHost(port: number, host: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const s = createServer();
    s.once("error", () => resolvePromise(false));
    s.listen(port, host, () => {
      s.close(() => resolvePromise(true));
    });
  });
}

async function checkPortOnAllHosts(port: number): Promise<boolean> {
  for (const host of DEV_PORT_PROBE_HOSTS) {
    if (!(await canListenOnHost(port, host))) {
      return false;
    }
  }
  return true;
}

function portPairForOffset(offset: number): { serverPort: number; webPort: number } {
  return {
    serverPort: BASE_SERVER_PORT + offset,
    webPort: BASE_WEB_PORT + offset,
  };
}

export async function findFirstAvailableOffset(input: {
  startOffset: number;
  requireServerPort: boolean;
  requireWebPort: boolean;
  probePort?: (port: number) => Promise<boolean>;
}): Promise<number> {
  const probe = input.probePort ?? checkPortOnAllHosts;
  for (let candidate = input.startOffset; ; candidate += 1) {
    const { serverPort, webPort } = portPairForOffset(candidate);
    if (
      (input.requireServerPort && serverPort > MAX_PORT) ||
      (input.requireWebPort && webPort > MAX_PORT)
    ) {
      break;
    }

    const checks: boolean[] = [];
    if (input.requireServerPort) {
      checks.push(await probe(serverPort));
    }
    if (input.requireWebPort) {
      checks.push(await probe(webPort));
    }

    if (checks.length === 0) return candidate;
    if (checks.every(Boolean)) return candidate;
  }

  throw new Error(
    `No available dev ports from offset ${input.startOffset} (server=${BASE_SERVER_PORT}+n web=${BASE_WEB_PORT}+n).`,
  );
}

export async function resolveModePortOffsets(input: {
  mode: DevMode;
  startOffset: number;
  hasExplicitServerPort: boolean;
  hasExplicitDevUrl: boolean;
  probePort?: (port: number) => Promise<boolean>;
}): Promise<{ serverOffset: number; webOffset: number }> {
  const probe = input.probePort;
  if (input.mode === "dev:web") {
    if (input.hasExplicitDevUrl) {
      return { serverOffset: input.startOffset, webOffset: input.startOffset };
    }
    const webOffset = await findFirstAvailableOffset({
      startOffset: input.startOffset,
      requireServerPort: false,
      requireWebPort: true,
      ...(probe ? { probePort: probe } : {}),
    });
    return { serverOffset: input.startOffset, webOffset };
  }

  if (input.mode === "dev:server") {
    if (input.hasExplicitServerPort) {
      return { serverOffset: input.startOffset, webOffset: input.startOffset };
    }
    const serverOffset = await findFirstAvailableOffset({
      startOffset: input.startOffset,
      requireServerPort: true,
      requireWebPort: false,
      ...(probe ? { probePort: probe } : {}),
    });
    return { serverOffset, webOffset: serverOffset };
  }

  const sharedOffset = await findFirstAvailableOffset({
    startOffset: input.startOffset,
    requireServerPort: !input.hasExplicitServerPort,
    requireWebPort: !input.hasExplicitDevUrl,
    ...(probe ? { probePort: probe } : {}),
  });

  return { serverOffset: sharedOffset, webOffset: sharedOffset };
}

export function createDevRunnerEnv(input: {
  mode: DevMode;
  baseEnv: NodeJS.ProcessEnv;
  serverOffset: number;
  webOffset: number;
  multiHome: string | undefined;
  noBrowser: boolean | undefined;
  host: string | undefined;
  port: number | undefined;
  devUrl: URL | undefined;
}): NodeJS.ProcessEnv {
  const serverPort = input.port ?? BASE_SERVER_PORT + input.serverOffset;
  const webPort = BASE_WEB_PORT + input.webOffset;
  const resolvedBaseDir = input.multiHome?.trim()
    ? resolve(input.multiHome.trim())
    : resolve(homedir(), ".multi");
  const isDesktopMode = input.mode === "dev";

  const output: NodeJS.ProcessEnv = {
    ...input.baseEnv,
    PORT: String(webPort),
    VITE_DEV_SERVER_URL:
      input.devUrl?.toString() ??
      `http://${isDesktopMode ? DESKTOP_DEV_LOOPBACK_HOST : "localhost"}:${webPort}`,
    MULTI_HOME: resolvedBaseDir,
  };

  if (!isDesktopMode) {
    output.MULTI_PORT = String(serverPort);
    output.VITE_HTTP_URL = `http://127.0.0.1:${serverPort}`;
    output.VITE_WS_URL = `ws://127.0.0.1:${serverPort}/ws`;
  } else {
    output.MULTI_PORT = String(serverPort);
    output.VITE_HTTP_URL = `http://${DESKTOP_DEV_LOOPBACK_HOST}:${serverPort}`;
    output.VITE_WS_URL = `ws://${DESKTOP_DEV_LOOPBACK_HOST}:${serverPort}/ws`;
    delete output.MULTI_MODE;
    delete output.MULTI_NO_BROWSER;
    delete output.MULTI_HOST;
  }

  if (!isDesktopMode && input.host !== undefined) {
    output.MULTI_HOST = input.host;
  }

  if (!isDesktopMode && input.noBrowser !== undefined) {
    output.MULTI_NO_BROWSER = input.noBrowser ? "1" : "0";
  } else if (!isDesktopMode) {
    delete output.MULTI_NO_BROWSER;
  }

  if (input.mode === "dev" || input.mode === "dev:server" || input.mode === "dev:web") {
    output.MULTI_MODE = "web";
    delete output.MULTI_DESKTOP_WS_URL;
  }

  if (isDesktopMode) {
    output.HOST = DESKTOP_DEV_LOOPBACK_HOST;
    delete output.MULTI_DESKTOP_WS_URL;
  }

  return output;
}

function parseMode(argv: string[]): { mode: DevMode; rest: string[] } {
  const modeArg = argv[0];
  if (!modeArg || !DEV_RUNNER_MODES.includes(modeArg as DevMode)) {
    console.error(`Usage: dev-runner.ts <${DEV_RUNNER_MODES.join("|")}> [turbo-args...]`);
    process.exit(1);
  }
  return { mode: modeArg as DevMode, rest: argv.slice(1) };
}

function parsePortOffset(): { portOffset: number | undefined; devInstance: string | undefined } {
  const rawOffset = process.env.MULTI_PORT_OFFSET;
  const portOffset =
    rawOffset !== undefined && rawOffset !== "" ? Number.parseInt(rawOffset, 10) : undefined;
  const devInstance = process.env.MULTI_DEV_INSTANCE?.trim();
  return {
    portOffset: Number.isFinite(portOffset) ? portOffset : undefined,
    devInstance: devInstance && devInstance.length > 0 ? devInstance : undefined,
  };
}

async function main(): Promise<void> {
  const { mode, rest } = parseMode(process.argv.slice(2));
  const { portOffset, devInstance } = parsePortOffset();
  const { offset, source } = resolveOffset({ portOffset, devInstance });

  const explicitPort =
    process.env.MULTI_PORT !== undefined && process.env.MULTI_PORT !== ""
      ? Number.parseInt(process.env.MULTI_PORT, 10)
      : undefined;
  const devUrlRaw = process.env.VITE_DEV_SERVER_URL?.trim();
  const devUrl = devUrlRaw ? new URL(devUrlRaw) : undefined;

  const { serverOffset, webOffset } = await resolveModePortOffsets({
    mode,
    startOffset: offset,
    hasExplicitServerPort: explicitPort !== undefined && Number.isFinite(explicitPort),
    hasExplicitDevUrl: devUrl !== undefined,
  });

  const multiHome = process.env.MULTI_HOME?.trim();
  const noBrowser =
    process.env.MULTI_NO_BROWSER === "1" || process.env.MULTI_NO_BROWSER?.toLowerCase() === "true"
      ? true
      : process.env.MULTI_NO_BROWSER === "0"
        ? false
        : undefined;
  const host = process.env.MULTI_HOST?.trim();

  const env = createDevRunnerEnv({
    mode,
    baseEnv: process.env,
    serverOffset,
    webOffset,
    multiHome: multiHome && multiHome.length > 0 ? multiHome : undefined,
    noBrowser,
    host: host && host.length > 0 ? host : undefined,
    port: explicitPort && Number.isFinite(explicitPort) ? explicitPort : undefined,
    devUrl,
  });

  const selectionSuffix =
    serverOffset !== offset || webOffset !== offset
      ? ` selectedOffset(server=${serverOffset},web=${webOffset})`
      : "";

  console.info(
    `[dev-runner] mode=${mode} source=${source}${selectionSuffix} serverPort=${env.MULTI_PORT ?? "?"} webPort=${env.PORT} baseDir=${env.MULTI_HOME ?? "?"}`,
  );

  const turboArgs = [...MODE_ARGS[mode], ...rest];
  const child = spawn("pnpm", ["exec", "turbo", ...turboArgs], {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  await new Promise<void>((resolvePromise, reject) => {
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      if (code !== 0) {
        reject(new Error(`turbo exited with code ${code}`));
        return;
      }
      resolvePromise();
    });
    child.on("error", reject);
  });
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
