#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

type ReleaseChannel = "stable" | "nightly";

interface StableVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: ReadonlyArray<string>;
}

interface NightlyVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly date: number;
  readonly runNumber: number;
}

const parseNumericIdentifier = (identifier: string): number | undefined =>
  /^\d+$/.test(identifier) ? Number(identifier) : undefined;

const comparePrereleaseIdentifiers = (left: string, right: string): number => {
  const leftNumeric = parseNumericIdentifier(left);
  const rightNumeric = parseNumericIdentifier(right);

  if (leftNumeric !== undefined && rightNumeric !== undefined) {
    return leftNumeric - rightNumeric;
  }
  if (leftNumeric !== undefined) {
    return -1;
  }
  if (rightNumeric !== undefined) {
    return 1;
  }
  return left.localeCompare(right);
};

const compareStableVersions = (left: StableVersion, right: StableVersion): number => {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  if (left.patch !== right.patch) return left.patch - right.patch;

  const leftHasPrerelease = left.prerelease.length > 0;
  const rightHasPrerelease = right.prerelease.length > 0;
  if (!leftHasPrerelease && !rightHasPrerelease) return 0;
  if (!leftHasPrerelease) return 1;
  if (!rightHasPrerelease) return -1;

  const maxLength = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftIdentifier = left.prerelease[index];
    const rightIdentifier = right.prerelease[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;

    const comparison = comparePrereleaseIdentifiers(leftIdentifier, rightIdentifier);
    if (comparison !== 0) return comparison;
  }

  return 0;
};

const parseStableTag = (tag: string): StableVersion | undefined => {
  const match = /^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(tag);
  if (!match) return undefined;

  const [, major, minor, patch, prerelease] = match;
  if (!major || !minor || !patch) return undefined;

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease ? prerelease.split(".") : [],
  };
};

const compareNightlyVersions = (left: NightlyVersion, right: NightlyVersion): number => {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  if (left.patch !== right.patch) return left.patch - right.patch;
  if (left.date !== right.date) return left.date - right.date;
  return left.runNumber - right.runNumber;
};

const parseNightlyTag = (tag: string): NightlyVersion | undefined => {
  const match = /^nightly-v(\d+)\.(\d+)\.(\d+)-nightly\.(\d{8})\.(\d+)$/.exec(tag);
  if (!match) return undefined;

  const [, major, minor, patch, date, runNumber] = match;
  if (!major || !minor || !patch || !date || !runNumber) return undefined;

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    date: Number(date),
    runNumber: Number(runNumber),
  };
};

export const resolvePreviousReleaseTag = (
  channel: ReleaseChannel,
  currentTag: string,
  tags: ReadonlyArray<string>,
): string | undefined => {
  if (channel === "stable") {
    const current = parseStableTag(currentTag);
    if (!current) {
      throw new Error(`Invalid stable release tag '${currentTag}'.`);
    }

    const candidates = tags
      .map((tag) => ({ tag, parsed: parseStableTag(tag) }))
      .filter(
        (entry): entry is { tag: string; parsed: StableVersion } => entry.parsed !== undefined,
      )
      .filter((entry) => compareStableVersions(entry.parsed, current) < 0)
      .toSorted((left, right) => compareStableVersions(right.parsed, left.parsed));

    return candidates[0]?.tag;
  }

  const current = parseNightlyTag(currentTag);
  if (!current) {
    throw new Error(`Invalid nightly release tag '${currentTag}'.`);
  }

  const candidates = tags
    .map((tag) => ({ tag, parsed: parseNightlyTag(tag) }))
    .filter((entry): entry is { tag: string; parsed: NightlyVersion } => entry.parsed !== undefined)
    .filter((entry) => compareNightlyVersions(entry.parsed, current) < 0)
    .toSorted((left, right) => compareNightlyVersions(right.parsed, left.parsed));

  return candidates[0]?.tag;
};

function listGitTags(): string[] {
  const result = spawnSync("git", ["tag", "--list"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git tag --list failed: ${result.stderr}`);
  }
  return result.stdout
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function parseArgs(argv: string[]): {
  channel: ReleaseChannel;
  currentTag: string;
  githubOutput: boolean;
} {
  let channel: ReleaseChannel | undefined;
  let currentTag: string | undefined;
  let githubOutput = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--channel" && argv[i + 1]) {
      const c = argv[++i];
      if (c === "stable" || c === "nightly") channel = c;
    } else if (a === "--current-tag" && argv[i + 1]) {
      currentTag = argv[++i];
    } else if (a === "--github-output") {
      githubOutput = true;
    } else if (a?.startsWith("--")) {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  if (channel === undefined) {
    throw new Error("Usage: --channel stable|nightly --current-tag <tag> [--github-output]");
  }
  if (!currentTag) {
    throw new Error("--current-tag is required.");
  }

  return { channel, currentTag, githubOutput };
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const tags = listGitTags();
  const previousTag = resolvePreviousReleaseTag(opts.channel, opts.currentTag, tags);
  const entry = `previous_tag=${previousTag ?? ""}\n`;

  if (opts.githubOutput) {
    const outPath = process.env.GITHUB_OUTPUT;
    if (!outPath) {
      throw new Error("GITHUB_OUTPUT is required when --github-output is set.");
    }
    appendFileSync(outPath, entry);
  } else {
    process.stdout.write(entry);
  }
}

main();
