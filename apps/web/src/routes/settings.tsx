import { RotateCcwIcon } from "lucide-react";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useSettingsRestore } from "../components/settings/SettingsPanels";
import { Button } from "../components/ui/button";

function SettingsContentLayout() {
  const [restoreSignal, setRestoreSignal] = useState(0);
  const { changedSettingLabels, restoreDefaults } = useSettingsRestore(() =>
    setRestoreSignal((value) => value + 1),
  );

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
    <div className="glass-settings-page flex min-h-0 min-w-0 flex-1 flex-col bg-transparent text-foreground">
      <header className="border-b border-border px-3 py-2 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Settings</span>
          <div className="ms-auto flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={changedSettingLabels.length === 0}
              onClick={() => void restoreDefaults()}
            >
              <RotateCcwIcon className="size-3.5" />
              Restore defaults
            </Button>
          </div>
        </div>
      </header>

      <div key={restoreSignal} className="min-h-0 flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

function SettingsRouteLayout() {
  return <SettingsContentLayout />;
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
