import { createFileRoute } from "@tanstack/react-router";

import { GlassChatSession } from "../components/glass-chat-session";
import { usePrimaryEnvironmentId } from "~/environments/primary";

function ChatIndexRouteView() {
  const environmentId = usePrimaryEnvironmentId();
  if (!environmentId) return null;

  return <GlassChatSession environmentId={environmentId} routeKind="draft" />;
}

export const Route = createFileRoute("/_chat/")({
  component: ChatIndexRouteView,
});
