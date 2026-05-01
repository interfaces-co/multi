import { createFileRoute, retainSearchParams } from "@tanstack/react-router";

import { ChatThreadRouteView } from "~/app/routes/chat-thread-route";
import { type ChatShellSearch, parseChatShellSearch } from "~/diff-route-search";

export const Route = createFileRoute("/_chat/$environmentId/$threadId")({
  validateSearch: (search: Record<string, unknown>) => parseChatShellSearch(search),
  search: {
    middlewares: [
      retainSearchParams<ChatShellSearch>(["diff", "diffTurnId", "diffFilePath", "workbench"]),
    ],
  },
  component: ChatThreadRouteView,
});
