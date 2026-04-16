// @ts-nocheck
"use client";

import { Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useShellPanels } from "~/hooks/use-shell-panels";
import { useShellState } from "~/hooks/use-shell-cwd";
import { useShellLayoutStore } from "~/lib/shell-layout-store";
import { AppShell } from "~/components/shell/shell/app";
import { SettingsNavRail } from "./nav-rail";
import { ShellSidebarFooter } from "~/components/shell/sidebar/footer";

export function SettingsShell() {
  const navigate = useNavigate();
  const match = useMatchRoute();
  const { cwd } = useShellState();
  const p = useShellPanels(cwd);
  const mute = useShellLayoutStore((state) => state.mute);
  const rightOpen = p.rightOpen;
  const setRightOpen = p.setRightOpen;
  const title = match({ to: "/settings/appearance" })
    ? "Appearance"
    : match({ to: "/settings/agents" })
      ? "Agents"
      : match({ to: "/settings/archived" })
        ? "Archived"
        : "Settings";

  useEffect(() => {
    if (cwd) mute(cwd);
    if (rightOpen) {
      setRightOpen(false);
    }
  }, [cwd, mute, rightOpen, setRightOpen]);

  return (
    <AppShell
      title={title}
      changesCount={0}
      onBack={() => void navigate({ to: "/" })}
      panels={p}
      left={
        <div className="thread-rail-pad flex min-h-0 flex-1 flex-col px-0">
          <SettingsNavRail />
          <ShellSidebarFooter settings />
        </div>
      }
      center={
        <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden px-4 py-4">
          <Outlet />
        </div>
      }
      right={null}
    />
  );
}
