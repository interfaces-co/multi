function basenameShellExecutable(shellPath: string | undefined | null): string | null {
  if (typeof shellPath !== "string") {
    return null;
  }
  const raw = shellPath.trim().replace(/^["']+|["']+$/g, "");
  if (raw.length === 0) {
    return null;
  }
  const last = Math.max(raw.lastIndexOf("/"), raw.lastIndexOf("\\"));
  const base = last < 0 ? raw : raw.slice(last + 1);
  const withoutExe = base.replace(/\.exe$/i, "");
  return withoutExe.length > 0 ? withoutExe : null;
}

/**
 * Short label for the terminal panel subtitle (VS Code / Cursor show login shell, e.g. `zsh`).
 */
export function inferLoginShellCaption(): string {
  try {
    const envShell =
      typeof process !== "undefined" && process.env && typeof process.env.SHELL === "string"
        ? process.env.SHELL
        : undefined;
    const fromEnv = basenameShellExecutable(envShell);
    if (fromEnv) {
      return fromEnv;
    }
  } catch {
    /* non-Node or restricted env */
  }

  if (typeof navigator !== "undefined" && /Win/i.test(navigator.userAgent)) {
    return "powershell";
  }

  return "zsh";
}
