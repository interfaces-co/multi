#!/usr/bin/env node
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function resolveNightlyBaseVersion(version: string): string {
  return version.replace(/[-+].*$/, "");
}

export function resolveNightlyReleaseMetadata(
  baseVersion: string,
  date: string,
  runNumber: number,
  sha: string,
): {
  baseVersion: string;
  version: string;
  tag: string;
  name: string;
  shortSha: string;
} {
  const shortSha = sha.slice(0, 12);
  const version = `${baseVersion}-nightly.${date}.${runNumber}`;
  return {
    baseVersion,
    version,
    tag: `nightly-v${version}`,
    name: `Multi Nightly ${version} (${shortSha})`,
    shortSha,
  };
}

function parseArgs(argv: string[]): {
  date: string;
  runNumber: number;
  sha: string;
  githubOutput: boolean;
  root: string | undefined;
} {
  let date: string | undefined;
  let runNumberStr: string | undefined;
  let sha: string | undefined;
  let githubOutput = false;
  let root: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date" && argv[i + 1]) date = argv[++i];
    else if (a === "--run-number" && argv[i + 1]) runNumberStr = argv[++i];
    else if (a === "--sha" && argv[i + 1]) sha = argv[++i];
    else if (a === "--github-output") githubOutput = true;
    else if (a === "--root" && argv[i + 1]) root = argv[++i];
    else if (a?.startsWith("--")) throw new Error(`Unknown argument: ${a}`);
  }

  if (!date || !/^\d{8}$/.test(date)) {
    throw new Error("Valid --date YYYYMMDD is required.");
  }
  if (!runNumberStr || !/^\d+$/.test(runNumberStr)) {
    throw new Error("Valid --run-number is required.");
  }
  const runNumber = Number(runNumberStr);
  if (runNumber < 1) {
    throw new Error("--run-number must be >= 1.");
  }
  if (!sha || !/^[0-9a-f]{7,40}$/i.test(sha)) {
    throw new Error("Valid --sha is required.");
  }

  return { date, runNumber, sha, githubOutput, root };
}

function readDesktopBaseVersion(rootDir: string | undefined): string {
  const workspaceRoot = rootDir ? resolve(rootDir) : repoRoot;
  const path = join(workspaceRoot, "apps/desktop/package.json");
  const pkg = JSON.parse(readFileSync(path, "utf8")) as { version?: string };
  if (!pkg.version || typeof pkg.version !== "string") {
    throw new Error("Invalid apps/desktop/package.json version.");
  }
  return resolveNightlyBaseVersion(pkg.version);
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const baseVersion = readDesktopBaseVersion(opts.root);
  const meta = resolveNightlyReleaseMetadata(baseVersion, opts.date, opts.runNumber, opts.sha);

  const entries = [
    ["base_version", meta.baseVersion],
    ["version", meta.version],
    ["tag", meta.tag],
    ["name", meta.name],
    ["short_sha", meta.shortSha],
  ] as const;

  if (opts.githubOutput) {
    const outPath = process.env.GITHUB_OUTPUT;
    if (!outPath) {
      throw new Error("GITHUB_OUTPUT is required when --github-output is set.");
    }
    const serialized = entries.map(([k, v]) => `${k}=${v}\n`).join("");
    appendFileSync(outPath, serialized);
  } else {
    for (const [k, v] of entries) {
      console.log(`${k}=${v}`);
    }
  }
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
