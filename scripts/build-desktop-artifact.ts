#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import rootPackageJson from "../package.json" with { type: "json" };
import desktopPackageJson from "../apps/desktop/package.json" with { type: "json" };
import serverPackageJson from "../apps/server/package.json" with { type: "json" };

import { BRAND_ASSET_PATHS } from "./lib/brand-assets.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type BuildPlatform = "mac" | "linux" | "win";
type BuildArch = "arm64" | "x64" | "universal";

class BuildScriptError extends Error {
  override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "BuildScriptError";
    this.cause = cause;
  }
}

const PLATFORM_CONFIG: Record<
  BuildPlatform,
  { cliFlag: string; defaultTarget: string; archChoices: BuildArch[] }
> = {
  mac: { cliFlag: "--mac", defaultTarget: "dmg", archChoices: ["arm64", "x64", "universal"] },
  linux: { cliFlag: "--linux", defaultTarget: "AppImage", archChoices: ["x64", "arm64"] },
  win: { cliFlag: "--win", defaultTarget: "nsis", archChoices: ["x64", "arm64"] },
};

function detectHostBuildPlatform(hostPlatform: string): BuildPlatform | undefined {
  if (hostPlatform === "darwin") return "mac";
  if (hostPlatform === "linux") return "linux";
  if (hostPlatform === "win32") return "win";
  return undefined;
}

function getDefaultArch(platform: BuildPlatform): BuildArch {
  const config = PLATFORM_CONFIG[platform];
  if (process.arch === "arm64" && config.archChoices.includes("arm64")) return "arm64";
  if (process.arch === "x64" && config.archChoices.includes("x64")) return "x64";
  return config.archChoices[0] ?? "x64";
}

function resolveGitCommitHash(): string {
  const result = spawnSync("git", ["rev-parse", "--short=12", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) return "unknown";
  const hash = result.stdout.trim();
  if (!/^[0-9a-f]{7,40}$/i.test(hash)) return "unknown";
  return hash.toLowerCase();
}

function concreteDependencies(deps: Record<string, string> | undefined): Record<string, string> {
  if (!deps) return {};
  return Object.fromEntries(
    Object.entries(deps).filter(([, spec]) => !spec.startsWith("workspace:")),
  );
}

function validateBundledClientAssets(clientDir: string): void {
  const indexPath = path.join(clientDir, "index.html");
  const indexHtml = readFileSync(indexPath, "utf8");
  const refs = [...indexHtml.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((v): v is string => v !== undefined);
  const missing: string[] = [];
  for (const ref of refs) {
    const normalizedRef = ref.split("#")[0]?.split("?")[0] ?? "";
    if (!normalizedRef) continue;
    if (normalizedRef.startsWith("http://") || normalizedRef.startsWith("https://")) continue;
    if (normalizedRef.startsWith("data:") || normalizedRef.startsWith("mailto:")) continue;
    if (!path.extname(normalizedRef)) continue;
    const relativePath = normalizedRef.replace(/^\/+/, "");
    const assetPath = path.join(clientDir, relativePath);
    if (!existsSync(assetPath)) missing.push(normalizedRef);
  }
  if (missing.length > 0) {
    throw new BuildScriptError(
      `Bundled client references missing files: ${missing.slice(0, 6).join(", ")}`,
    );
  }
}

export function resolveDesktopProductName(version: string): string {
  return /-nightly\.\d{8}\.\d+$/.test(version)
    ? "Multi (Nightly)"
    : (desktopPackageJson.productName ?? "Multi");
}

export function resolveDesktopUpdateChannel(version: string): "nightly" | "latest" {
  return /-nightly\.\d{8}\.\d+$/.test(version) ? "nightly" : "latest";
}

export function resolveDesktopBuildIconAssets(version: string): {
  macIconPng: string;
  linuxIconPng: string;
  windowsIconIco: string;
} {
  return /-nightly\.\d{8}\.\d+$/.test(version)
    ? {
        macIconPng: BRAND_ASSET_PATHS.nightlyMacIconPng,
        linuxIconPng: BRAND_ASSET_PATHS.nightlyLinuxIconPng,
        windowsIconIco: BRAND_ASSET_PATHS.nightlyWindowsIconIco,
      }
    : {
        macIconPng: BRAND_ASSET_PATHS.productionMacIconPng,
        linuxIconPng: BRAND_ASSET_PATHS.productionLinuxIconPng,
        windowsIconIco: BRAND_ASSET_PATHS.productionWindowsIconIco,
      };
}

function parseArgs(argv: string[]): {
  platform: BuildPlatform;
  target: string;
  arch: BuildArch;
  version: string | undefined;
  outputDir: string;
  skipBuild: boolean;
  verbose: boolean;
} {
  let platform = detectHostBuildPlatform(process.platform);
  let target: string | undefined;
  let arch: BuildArch | undefined;
  let version: string | undefined;
  let outputDir = path.join(repoRoot, "release");
  let skipBuild = false;
  let verbose = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--platform" && argv[i + 1]) {
      const p = argv[++i] as BuildPlatform;
      if (p === "mac" || p === "linux" || p === "win") platform = p;
    } else if (a === "--mac") platform = "mac";
    else if (a === "--linux") platform = "linux";
    else if (a === "--win") platform = "win";
    else if (a === "--target" && argv[i + 1]) target = argv[++i];
    else if (a === "--arch" && argv[i + 1]) arch = argv[++i] as BuildArch;
    else if (a === "--build-version" && argv[i + 1]) version = argv[++i];
    else if (a === "--output-dir" && argv[i + 1]) outputDir = path.resolve(repoRoot, argv[++i]!);
    else if (a === "--skip-build") skipBuild = true;
    else if (a === "--verbose") verbose = true;
  }

  if (!platform) {
    throw new BuildScriptError(`Unsupported host platform '${process.platform}'.`);
  }

  const pconf = PLATFORM_CONFIG[platform];
  return {
    platform,
    target: target ?? pconf.defaultTarget,
    arch: arch ?? getDefaultArch(platform),
    version,
    outputDir,
    skipBuild,
    verbose,
  };
}

function run(
  cmd: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  _verbose: boolean,
): void {
  const res = spawnSync(cmd, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    throw new BuildScriptError(`${cmd} ${args.join(" ")} exited ${res.status}`);
  }
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.skipBuild) {
    run("pnpm", ["run", "build:desktop"], repoRoot, process.env, opts.verbose);
  }

  const distDirs = {
    desktopDist: path.join(repoRoot, "apps/desktop/dist-electron"),
    desktopResources: path.join(repoRoot, "apps/desktop/resources"),
    serverDist: path.join(repoRoot, "apps/server/dist"),
  };

  for (const [label, dir] of Object.entries(distDirs)) {
    if (!existsSync(dir)) {
      throw new BuildScriptError(`Missing ${label} at ${dir}. Run pnpm run build:desktop first.`);
    }
  }

  const bundledClientEntry = path.join(distDirs.serverDist, "client/index.html");
  if (!existsSync(bundledClientEntry)) {
    throw new BuildScriptError(`Missing bundled client at ${bundledClientEntry}.`);
  }
  validateBundledClientAssets(path.dirname(bundledClientEntry));

  const appVersion = opts.version ?? serverPackageJson.version;
  const iconAssets = /-nightly\.\d{8}\.\d+$/.test(appVersion)
    ? {
        macIconPng: BRAND_ASSET_PATHS.nightlyMacIconPng,
        linuxIconPng: BRAND_ASSET_PATHS.nightlyLinuxIconPng,
        windowsIconIco: BRAND_ASSET_PATHS.nightlyWindowsIconIco,
      }
    : {
        macIconPng: BRAND_ASSET_PATHS.productionMacIconPng,
        linuxIconPng: BRAND_ASSET_PATHS.productionLinuxIconPng,
        windowsIconIco: BRAND_ASSET_PATHS.productionWindowsIconIco,
      };

  const stageRoot = mkdtempSync(path.join(os.tmpdir(), "multi-desktop-stage-"));
  const stageAppDir = path.join(stageRoot, "app");
  const stageResourcesDir = path.join(stageAppDir, "apps/desktop/resources");

  try {
    mkdirSync(path.join(stageAppDir, "apps/desktop"), { recursive: true });
    mkdirSync(path.join(stageAppDir, "apps/server"), { recursive: true });

    cpSync(distDirs.desktopDist, path.join(stageAppDir, "apps/desktop/dist-electron"), {
      recursive: true,
    });
    mkdirSync(stageResourcesDir, { recursive: true });
    cpSync(distDirs.desktopResources, stageResourcesDir, { recursive: true });
    cpSync(distDirs.serverDist, path.join(stageAppDir, "apps/server/dist"), { recursive: true });

    if (
      opts.platform === "mac" &&
      process.platform === "darwin" &&
      existsSync(path.join(repoRoot, iconAssets.macIconPng))
    ) {
      const png = path.join(repoRoot, iconAssets.macIconPng);
      run(
        "sips",
        ["-z", "512", "512", png, "--out", path.join(stageResourcesDir, "icon.png")],
        repoRoot,
        process.env,
        opts.verbose,
      );
      const iconset = mkdtempSync(path.join(os.tmpdir(), "multi-icon-"));
      try {
        for (const size of [16, 32, 128, 256, 512] as const) {
          run(
            "sips",
            [
              "-z",
              String(size),
              String(size),
              png,
              "--out",
              path.join(iconset, `icon_${size}x${size}.png`),
            ],
            repoRoot,
            process.env,
            opts.verbose,
          );
          run(
            "sips",
            [
              "-z",
              String(size * 2),
              String(size * 2),
              png,
              "--out",
              path.join(iconset, `icon_${size}x${size}@2x.png`),
            ],
            repoRoot,
            process.env,
            opts.verbose,
          );
        }
        run(
          "iconutil",
          ["-c", "icns", iconset, "-o", path.join(stageResourcesDir, "icon.icns")],
          repoRoot,
          process.env,
          opts.verbose,
        );
      } finally {
        rmSync(iconset, { recursive: true, force: true });
      }
    }

    cpSync(stageResourcesDir, path.join(stageAppDir, "apps/desktop/prod-resources"), {
      recursive: true,
    });

    const pnpmOverrides =
      rootPackageJson && typeof rootPackageJson === "object" && "pnpm" in rootPackageJson
        ? (rootPackageJson as { pnpm?: { overrides?: Record<string, string> } }).pnpm?.overrides
        : undefined;

    const stagePackageJson = {
      name: "multi",
      version: appVersion,
      buildVersion: appVersion,
      multiCommitHash: resolveGitCommitHash(),
      private: true,
      description: "Multi desktop build",
      author: "Interfaces Co",
      main: "apps/desktop/dist-electron/main.js",
      build: {
        appId: "com.interfacesco.multi",
        productName: resolveDesktopProductName(appVersion),
        artifactName: "Multi-${version}-${arch}.${ext}",
        directories: { buildResources: "apps/desktop/resources" },
        mac:
          opts.platform === "mac"
            ? {
                target: opts.target === "dmg" ? [opts.target, "zip"] : [opts.target],
                icon: "icon.icns",
                category: "public.app-category.developer-tools",
              }
            : undefined,
        linux:
          opts.platform === "linux"
            ? {
                target: [opts.target],
                executableName: "multi",
                icon: "icon.png",
                category: "Development",
                desktop: { entry: { StartupWMClass: "multi" } },
              }
            : undefined,
        win:
          opts.platform === "win"
            ? {
                target: [opts.target],
                icon: "icon.ico",
                signAndEditExecutable: false,
              }
            : undefined,
      },
      dependencies: {
        ...concreteDependencies(serverPackageJson.dependencies),
        ...concreteDependencies(desktopPackageJson.dependencies),
      },
      devDependencies: {
        electron: desktopPackageJson.dependencies.electron,
      },
      ...(pnpmOverrides ? { pnpm: { overrides: pnpmOverrides } } : {}),
    };

    writeFileSync(
      path.join(stageAppDir, "package.json"),
      `${JSON.stringify(stagePackageJson, null, 2)}\n`,
    );

    run("pnpm", ["install", "--prod"], stageAppDir, process.env, opts.verbose);

    const buildEnv = { ...process.env };
    buildEnv.CSC_IDENTITY_AUTO_DISCOVERY = "false";
    delete buildEnv.CSC_LINK;
    delete buildEnv.CSC_KEY_PASSWORD;

    const pconf = PLATFORM_CONFIG[opts.platform];
    run(
      "pnpm",
      ["exec", "electron-builder", pconf.cliFlag, `--${opts.arch}`, "--publish", "never"],
      stageAppDir,
      buildEnv,
      opts.verbose,
    );

    const stageDistDir = path.join(stageAppDir, "dist");
    if (!existsSync(stageDistDir)) {
      throw new BuildScriptError(`Missing dist at ${stageDistDir}`);
    }

    mkdirSync(opts.outputDir, { recursive: true });
    for (const entry of readdirSync(stageDistDir)) {
      const from = path.join(stageDistDir, entry);
      if (!statSync(from).isFile()) continue;
      cpSync(from, path.join(opts.outputDir, entry));
    }

    console.info(`[desktop-artifact] Done. Output: ${opts.outputDir}`);
  } finally {
    rmSync(stageRoot, { recursive: true, force: true });
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
