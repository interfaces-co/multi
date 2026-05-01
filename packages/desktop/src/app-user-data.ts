import * as Path from "node:path";

export interface ResolveDesktopUserDataPathOptions {
  readonly appDataBase: string;
  readonly userDataDirName: string;
  readonly legacyUserDataDirName: string;
  readonly existsSync: (path: string) => boolean;
}

/**
 * Resolve the on-disk Chromium userData directory.
 *
 * Electron's default path is derived from `productName` and may include spaces
 * and parentheses (e.g. `Multi (Alpha)`), which is awkward for shells and
 * scripts. Prefer a clean directory name when no legacy data exists.
 *
 * Multiple GUI processes must not share the same userData directory: Chromium
 * takes a profile lock (SingletonLock). Production and dev shells use a single
 * GUI instance per profile via `app.requestSingleInstanceLock` in main.
 *
 * If you deliberately need two Electron windows as **separate Chromium
 * profiles** (e.g. two parallel dev stacks): use isolated state roots so they
 * do not resolve to the same `userDataDirName`, for example distinct
 * `--home-dir` / `MULTI_HOME` per checkout, different macOS login sessions, or a
 * second machine. Do not start two mains against the same `multi-dev` profile.
 */
export function resolveDesktopUserDataPath({
  appDataBase,
  userDataDirName,
  legacyUserDataDirName,
  existsSync,
}: ResolveDesktopUserDataPathOptions): string {
  const legacyPath = Path.join(appDataBase, legacyUserDataDirName);
  if (existsSync(legacyPath)) {
    return legacyPath;
  }

  return Path.join(appDataBase, userDataDirName);
}
