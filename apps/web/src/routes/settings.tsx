import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";

import {
  SettingsRestoreProvider,
  useSettingsRestoreState,
} from "../components/settings/settings-restore-context";
import { ShellHost } from "../components/shell-host";

function SettingsContentLayout() {
  const { restoreSignal } = useSettingsRestoreState();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        window.history.back();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="settings-form-page flex min-h-0 min-w-0 flex-1 flex-col bg-transparent text-foreground">
      <div key={restoreSignal} className="min-h-0 flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

function SettingsRouteLayout() {
  return (
    <SettingsRestoreProvider>
      <ShellHost mode="settings">
        <SettingsContentLayout />
      </ShellHost>
    </SettingsRestoreProvider>
  );
}

export const Route = createFileRoute("/settings")({
  beforeLoad: async ({ context, location }) => {
    if (context.authGateState.status !== "authenticated") {
      throw redirect({ to: "/pair", replace: true });
    }

    if (location.pathname === "/settings") {
      throw redirect({ to: "/settings/general", replace: true });
    }
  },
  component: SettingsRouteLayout,
});
