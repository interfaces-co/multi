import { WorkerPoolContextProvider } from "@pierre/diffs/react";
import DiffsWorker from "@pierre/diffs/worker/worker.js?worker";
import { useMemo, type ReactNode } from "react";
import { useTheme } from "../hooks/use-theme";
import { resolveDiffThemeName } from "../lib/diff-rendering";

export function DiffWorkerPoolProvider({ children }: { children?: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const diffThemeName = resolveDiffThemeName(resolvedTheme);
  const workerPoolSize = useMemo(() => {
    const cores =
      typeof navigator === "undefined" ? 4 : Math.max(1, navigator.hardwareConcurrency || 4);
    return Math.max(2, Math.min(6, Math.floor(cores / 2)));
  }, []);

  return (
    <WorkerPoolContextProvider
      key={diffThemeName}
      poolOptions={{
        workerFactory: () => new DiffsWorker(),
        poolSize: workerPoolSize,
        totalASTLRUCacheSize: 240,
      }}
      highlighterOptions={{
        theme: diffThemeName,
        tokenizeMaxLineLength: 1_000,
      }}
    >
      {children}
    </WorkerPoolContextProvider>
  );
}
