// @ts-nocheck
"use client";

import {
  IconClipboard,
  IconFileBend,
  IconHashtag,
  IconPlusLarge,
  IconSettingsGear2,
  IconSidebar,
  IconSidebarHiddenLeftWide,
  IconSidebarHiddenRightWide,
  IconToolbox,
} from "central-icons";
import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { toast } from "sonner";

import { CommandPalette } from "~/components/ui/command-palette";
import { Kbd } from "~/components/ui/kbd";
import { useTheme } from "~/hooks/use-theme";
import { useServerObservability } from "~/rpc/server-state";
import type { AppShellPanels } from "./app";

const SEG_MAX = 80;

function safe(id: string) {
  const next = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, SEG_MAX)
    .replace(/[-_]+$/g, "");
  return next.length > 0 ? next : null;
}

function join(left: string, right: string) {
  const sep = left.includes("\\") && !left.includes("/") ? "\\" : "/";
  return `${left.replace(/[\\/]+$/g, "")}${sep}${right.replace(/^[\\/]+/g, "")}`;
}

function log(dir: string, id: string) {
  const part = safe(id);
  if (!part) return null;
  return join(join(dir, "provider"), `${part}.log`);
}

interface Props {
  panels: AppShellPanels;
  onNewChat: () => void;
  routeThreadId: string | null;
}

export function CommandPalette(props: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const obs = useServerObservability();

  useHotkey("Mod+Shift+P", (e) => {
    e.preventDefault();
    setOpen(true);
  });

  const run = useCallback((cb: () => void | Promise<void>) => {
    setOpen(false);
    void cb();
  }, []);

  const copy = useCallback(async (label: string, text: string | null, missing: string) => {
    if (!text) {
      toast.error(missing);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Clipboard unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch (err) {
      toast.error(`Failed to copy ${label.toLowerCase()}`, {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const copyId = useCallback(
    () => copy("Thread ID", props.routeThreadId, "No active thread"),
    [copy, props.routeThreadId],
  );

  const copyLog = useCallback(() => {
    if (!props.routeThreadId) {
      toast.error("No active thread");
      return;
    }
    return copy(
      "Thread log path",
      obs?.logsDirectoryPath ? log(obs.logsDirectoryPath, props.routeThreadId) : null,
      "No thread log path available",
    );
  }, [copy, obs, props.routeThreadId]);

  return (
    <CommandPalette.Dialog open={open} onOpenChange={setOpen} label="Command palette" loop>
      <CommandPalette.Input placeholder="Type a command..." />
      <CommandPalette.List>
        <CommandPalette.Empty>No commands found.</CommandPalette.Empty>

        <CommandPalette.Group heading="Navigation">
          <CommandPalette.Item value="new chat" onSelect={() => run(props.onNewChat)}>
            <IconPlusLarge className="size-4 shrink-0 text-muted-foreground/60" />
            <span className="flex-1">New Chat</span>
            <Kbd keys={["⌘", "N"]} />
          </CommandPalette.Item>
          <CommandPalette.Item
            value="open settings"
            onSelect={() => run(() => navigate({ to: "/settings/general" }))}
          >
            <IconSettingsGear2 className="size-4 shrink-0 text-muted-foreground/60" />
            <span className="flex-1">Open Settings</span>
            <Kbd keys={["⌘", ","]} />
          </CommandPalette.Item>
        </CommandPalette.Group>

        <CommandPalette.Group heading="Layout">
          <CommandPalette.Item
            value="toggle left panel sidebar"
            onSelect={() => run(() => props.panels.toggleLeft())}
          >
            {props.panels.leftOpen ? (
              <IconSidebarHiddenLeftWide className="size-4 shrink-0 text-muted-foreground/60" />
            ) : (
              <IconSidebar className="size-4 shrink-0 text-muted-foreground/60" />
            )}
            <span className="flex-1">
              {props.panels.leftOpen ? "Hide Left Panel" : "Show Left Panel"}
            </span>
            <Kbd keys={["⌘", "B"]} />
          </CommandPalette.Item>
          <CommandPalette.Item
            value="toggle right panel changes"
            onSelect={() => run(() => props.panels.toggleRight())}
          >
            {props.panels.rightOpen ? (
              <IconSidebarHiddenRightWide className="size-4 shrink-0 text-muted-foreground/60" />
            ) : (
              <IconSidebar className="size-4 shrink-0 text-muted-foreground/60" />
            )}
            <span className="flex-1">
              {props.panels.rightOpen ? "Hide Changes Panel" : "Show Changes Panel"}
            </span>
          </CommandPalette.Item>
        </CommandPalette.Group>

        <CommandPalette.Group heading="Appearance">
          <CommandPalette.Item
            value="toggle theme light dark"
            keywords={["appearance", "mode"]}
            onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
          >
            <span className="flex size-4 shrink-0 items-center justify-center text-detail text-muted-foreground/60">
              {resolvedTheme === "dark" ? "☀" : "☾"}
            </span>
            <span className="flex-1">
              Switch to {resolvedTheme === "dark" ? "Light" : "Dark"} Theme
            </span>
          </CommandPalette.Item>
          <CommandPalette.Item
            value="theme system"
            keywords={["auto", "appearance"]}
            onSelect={() => run(() => setTheme("system"))}
          >
            <span className="flex size-4 shrink-0 items-center justify-center text-detail text-muted-foreground/60">
              ◐
            </span>
            <span className="flex-1">Use System Theme</span>
          </CommandPalette.Item>
        </CommandPalette.Group>

        {import.meta.env.DEV ? (
          <CommandPalette.Group heading="Developer">
            <CommandPalette.Item
              value="dev debug intents"
              keywords={["provider", "runtime", "intents", "debug", "mapping", "ui"]}
              onSelect={() => run(() => void navigate({ to: "/debug/intents" }))}
            >
              <IconClipboard className="size-4 shrink-0 text-muted-foreground/60" />
              <span className="flex-1">Dev: Debug intents</span>
            </CommandPalette.Item>
            <CommandPalette.Item
              value="dev chat timeline fixture"
              keywords={[
                "timeline",
                "chat",
                "rows",
                "fixture",
                "preview",
                "synthetic",
                "transcript",
                "html",
                "debug",
              ]}
              onSelect={() => run(() => void navigate({ to: "/debug/timeline" }))}
            >
              <IconToolbox className="size-4 shrink-0 text-muted-foreground/60" />
              <span className="flex-1">Dev: Chat timeline fixture</span>
            </CommandPalette.Item>
            <CommandPalette.Item
              value="dev copy thread id"
              keywords={["thread", "uuid", "copy", "clipboard", "id"]}
              disabled={!props.routeThreadId}
              onSelect={() => run(copyId)}
            >
              <IconHashtag className="size-4 shrink-0 text-muted-foreground/60" />
              <span className="flex-1">Dev: Copy thread ID</span>
            </CommandPalette.Item>
            <CommandPalette.Item
              value="dev copy thread log path"
              keywords={["thread", "log", "debug", "session", "path", "copy", "disk"]}
              disabled={!props.routeThreadId || !obs?.logsDirectoryPath}
              onSelect={() => run(copyLog)}
            >
              <IconFileBend className="size-4 shrink-0 text-muted-foreground/60" />
              <span className="flex-1">Dev: Copy thread log path</span>
            </CommandPalette.Item>
          </CommandPalette.Group>
        ) : null}
      </CommandPalette.List>
    </CommandPalette.Dialog>
  );
}
