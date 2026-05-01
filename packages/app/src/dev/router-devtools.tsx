import { lazy, Suspense } from "react";

const TanStackRouterDevtools = lazy(() =>
  import("@tanstack/react-router-devtools").then((m) => ({
    default: m.TanStackRouterDevtools,
  })),
);

export function RouterDevtoolsPanel() {
  if (!import.meta.env.DEV) {
    return null;
  }
  return (
    <Suspense fallback={null}>
      <TanStackRouterDevtools position="bottom-right" />
    </Suspense>
  );
}
