import { createFileRoute } from "@tanstack/react-router";

import { RoutedChatSession } from "../components/routed-chat-session";
import { usePrimaryEnvironmentId } from "~/environments/primary";

function ChatIndexRouteView() {
  const environmentId = usePrimaryEnvironmentId();
  if (!environmentId) return null;

  return <RoutedChatSession environmentId={environmentId} routeKind="draft" />;
}

export const Route = createFileRoute("/_chat/")({
  component: ChatIndexRouteView,
});
