#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { startRawServer } from "./run-server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readBootstrapLine(fd: number): string | null {
  try {
    const raw = fs.readFileSync(fd, "utf8");
    const line = raw.trim().split("\n")[0];
    return line && line.length > 0 ? line : null;
  } catch {
    return null;
  }
}

function parseArgs(argv: string[]): {
  port: number;
  host: string;
  staticDir: string | undefined;
  codexBinary: string;
  cwd: string;
  openBrowser: boolean;
  bootstrapFd: number | undefined;
} {
  let port = Number(process.env.MULTI_PORT) || 3773;
  let host = process.env.MULTI_HOST?.trim() || "127.0.0.1";
  let staticDir = process.env.MULTI_STATIC_DIR?.trim();
  let codexBinary = process.env.CODEX_BINARY?.trim() || "codex";
  let cwd = process.cwd();
  let openBrowser =
    process.env.MULTI_NO_BROWSER !== "1" && process.env.MULTI_NO_BROWSER?.toLowerCase() !== "true";
  let bootstrapFd: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--port" && argv[i + 1]) port = Number(argv[++i]);
    else if (a === "--host" && argv[i + 1]) host = argv[++i]!;
    else if (a === "--static-dir" && argv[i + 1]) staticDir = argv[++i]!;
    else if (a === "--codex-binary" && argv[i + 1]) codexBinary = argv[++i]!;
    else if (a === "--cwd" && argv[i + 1]) cwd = argv[++i]!;
    else if (a === "--no-browser") openBrowser = false;
    else if (a === "--bootstrap-fd" && argv[i + 1]) bootstrapFd = Number(argv[++i]);
  }

  if (bootstrapFd !== undefined) {
    const line = readBootstrapLine(bootstrapFd);
    if (line) {
      try {
        const env = JSON.parse(line) as Record<string, unknown>;
        if (typeof env.port === "number") port = env.port;
        if (typeof env.host === "string" && env.host.length > 0) host = env.host;
        if (typeof env.multiHome === "string" && env.multiHome.length > 0) {
          process.env.MULTI_HOME = env.multiHome;
        }
        if (env.noBrowser === true) openBrowser = false;
      } catch {
        /* ignore invalid bootstrap */
      }
    }
  }

  if (!staticDir) {
    const nextToBin = path.join(__dirname, "client");
    if (fs.existsSync(path.join(nextToBin, "index.html"))) {
      staticDir = nextToBin;
    }
  }

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${port}`);
  }

  return { port, host, staticDir, codexBinary, cwd, openBrowser, bootstrapFd };
}

const args = parseArgs(process.argv.slice(2));

void startRawServer({
  port: args.port,
  host: args.host,
  staticDir: args.staticDir,
  codexBinary: args.codexBinary,
  cwd: args.cwd,
  openBrowser: args.openBrowser,
}).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
