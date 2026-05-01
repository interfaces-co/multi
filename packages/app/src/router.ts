import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterHistory } from "@tanstack/react-router";

import { AppAtomRegistryProvider } from "./rpc/atom-registry";
import { routeTree } from "./routeTree.gen";

export function getRouter(history: RouterHistory) {
  const queryClient = new QueryClient();

  return createRouter({
    routeTree,
    history,
    // t3code parity: keep router preloading defaults.
    // Adding defaultPreload here breaks Electron entry-point startup handling.
    context: {
      queryClient,
    },
    Wrap: ({ children }) =>
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(AppAtomRegistryProvider, undefined, children),
      ),
  });
}

export type AppRouter = ReturnType<typeof getRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
