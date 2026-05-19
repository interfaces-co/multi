import { Outlet } from "@tanstack/react-router";
import { useEffectEvent } from "react";

import {
  SettingsRestoreProvider,
  useSettingsRestoreState,
} from "~/components/settings/settings-restore-context";
import { ShellHost } from "~/components/shell-host";
import { useMountEffect } from "~/hooks/use-mount-effect";
import { resolveShortcutCommand } from "~/keybindings";
import { useServerKeybindings } from "~/rpc/server-state";

function SettingsContentLayout() {
  const { restoreSignal } = useSettingsRestoreState();
  const keybindings = useServerKeybindings();

  const handleWindowKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return;

    const command = resolveShortcutCommand(event, keybindings, {
      context: {
        terminalFocus: false,
        terminalOpen: false,
      },
    });
    if (command !== "route.back") {
      return;
    }

    event.preventDefault();
    window.history.back();
  });

  useMountEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      handleWindowKeyDown(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  return (
    <div className="settings-form-page flex min-h-0 min-w-0 flex-1 flex-col bg-transparent text-foreground">
      <div key={restoreSignal} className="min-h-0 flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

export function SettingsRouteLayout() {
  return (
    <SettingsRestoreProvider>
      <ShellHost mode="settings">
        <SettingsContentLayout />
      </ShellHost>
    </SettingsRestoreProvider>
  );
}
