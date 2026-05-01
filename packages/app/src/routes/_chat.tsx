import { createFileRoute, redirect } from "@tanstack/react-router";

import { ChatRouteLayout } from "~/app/routes/chat-route";
import { parseChatShellSearch } from "~/diff-route-search";

export const Route = createFileRoute("/_chat")({
  validateSearch: (search: Record<string, unknown>) => parseChatShellSearch(search),
  beforeLoad: async ({ context }) => {
    if (context.authGateState.status !== "authenticated") {
      throw redirect({ to: "/pair", replace: true });
    }
  },
  component: ChatRouteLayout,
});
