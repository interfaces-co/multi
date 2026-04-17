// @ts-nocheck
"use client";

import { type EnvironmentId, DEFAULT_TERMINAL_ID, type TerminalEvent } from "@multi/contracts";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal, type ITheme } from "@xterm/xterm";
import type { DesktopTerminalAppearance } from "~/lib/ui-session-types";
import { useEffect, useMemo, useRef, useState } from "react";

import { readTerminalHostTheme } from "~/components/shell/terminal/terminal-host-theme";
import { useTheme } from "~/hooks/use-theme";
import { readNativeEnvironmentApi } from "~/lib/native-runtime-api";

function workbenchThreadId(cwd: string) {
  return `workbench:${cwd}`;
}

type WorkbenchTerminalApi = NonNullable<ReturnType<typeof readNativeEnvironmentApi>>["terminal"];

function readWorkbenchTerminalApi(
  environmentId: EnvironmentId | null | undefined,
): WorkbenchTerminalApi | null {
  return (
    readNativeEnvironmentApi(environmentId, {
      allowPrimaryEnvironmentFallback: true,
    })?.terminal ?? null
  );
}

function readFontFamily(el: HTMLElement) {
  const node = document.createElement("span");
  node.style.position = "absolute";
  node.style.opacity = "0";
  node.style.pointerEvents = "none";
  node.style.fontFamily = "var(--font-multi-mono), ui-monospace, monospace";
  el.append(node);
  const value = getComputedStyle(node).fontFamily || "ui-monospace, monospace";
  node.remove();
  return value;
}

function readDesktopTheme(view: DesktopTerminalAppearance) {
  const theme = view.theme;
  if (!theme) return null;
  const palette = theme.palette ?? [];
  const pick = (idx: number, fallback: string) => {
    const value = palette[idx];
    return typeof value === "string" ? value : fallback;
  };

  return {
    background: theme.background ?? "#101010",
    foreground: theme.foreground ?? "#ffffff",
    cursor: theme.cursor ?? theme.foreground ?? "#ffffff",
    cursorAccent: theme.cursorText ?? theme.background ?? "#101010",
    selectionBackground: theme.selectionBackground ?? "#988049",
    selectionForeground: theme.selectionForeground ?? theme.foreground ?? "#ffffff",
    black: pick(0, "#101010"),
    red: pick(1, "#f5a191"),
    green: pick(2, "#90b99f"),
    yellow: pick(3, "#e6b99d"),
    blue: pick(4, "#aca1cf"),
    magenta: pick(5, "#e29eca"),
    cyan: pick(6, "#ea83a5"),
    white: pick(7, "#a0a0a0"),
    brightBlack: pick(8, "#7e7e7e"),
    brightRed: pick(9, "#ff8080"),
    brightGreen: pick(10, "#99ffe4"),
    brightYellow: pick(11, "#ffc799"),
    brightBlue: pick(12, "#b9aeda"),
    brightMagenta: pick(13, "#ecaad6"),
    brightCyan: pick(14, "#f591b2"),
    brightWhite: pick(15, "#ffffff"),
  } satisfies ITheme;
}

export function TerminalPanel(props: { cwd: string | null; environmentId?: EnvironmentId | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fit = useRef<FitAddon | null>(null);
  const size = useRef<{ thread: string; cols: number; rows: number } | null>(null);
  const { resolvedTheme } = useTheme();
  const [view, setView] = useState<DesktopTerminalAppearance | null | undefined>(undefined);
  const [bootErr, setBootErr] = useState<string | null>(null);
  const ghost = useMemo(() => (view ? readDesktopTheme(view) : null), [view]);
  const mode = ghost ? null : resolvedTheme;
  const style = useMemo(
    () =>
      ghost
        ? {
            backgroundColor: ghost.background,
            color: ghost.foreground,
          }
        : undefined,
    [ghost],
  );

  const dev = import.meta.env.DEV;

  useEffect(() => {
    let live = true;
    const bridge = window.desktopBridge;

    if (!bridge?.getTerminalAppearance) {
      setView(null);
      return () => {
        live = false;
      };
    }

    void bridge
      .getTerminalAppearance(resolvedTheme)
      .then((next) => {
        if (!live) return;
        setView(next);
      })
      .catch((err) => {
        if (dev) console.warn("[TerminalPanel] getTerminalAppearance failed", err);
        if (!live) return;
        setView(null);
      });

    return () => {
      live = false;
    };
  }, [dev, resolvedTheme]);

  useEffect(() => {
    const el = ref.current;
    const api = readWorkbenchTerminalApi(props.environmentId);
    if (!el || !api || !props.cwd || view === undefined) return;

    const cwd = props.cwd;
    const thread = workbenchThreadId(cwd);
    const cfg = ghost ?? readTerminalHostTheme(el, mode ?? "dark");
    const family = view?.fontFamily ?? readFontFamily(el);
    const fontSize = view?.fontSize ?? 13;

    let live = true;
    let off: (() => void) | undefined;
    let data: { dispose: () => void } | undefined;
    let next: Terminal | null = null;
    let addon: FitAddon | null = null;

    setBootErr(null);

    try {
      next = new Terminal({
        fontSize,
        fontFamily: family,
        cursorBlink: true,
        theme: cfg,
        scrollback: 10_000,
      });
      addon = new FitAddon();
      next.loadAddon(addon);
      el.replaceChildren();
      next.open(el);
      addon.fit();
      size.current = { thread, cols: next.cols, rows: next.rows };
      term.current = next;
      fit.current = addon;
    } catch (err) {
      if (dev) console.warn("[TerminalPanel] xterm init failed", err);
      setBootErr("Could not load terminal renderer.");
      return () => {
        live = false;
        off?.();
        data?.dispose();
        next?.dispose();
        term.current = null;
        fit.current = null;
        size.current = null;
        el.replaceChildren();
      };
    }

    let seed: string | null = null;

    const hydrate = (value: string | null | undefined) => {
      const nextValue = value ?? "";
      if (seed === nextValue) return;
      seed = nextValue;
      if (nextValue) next.write(nextValue);
    };

    const clear = () => {
      seed = "";
      next.clear();
    };

    next.attachCustomKeyEventHandler((event) => {
      const hit =
        event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        event.code === "KeyK";
      if (!hit) return true;
      event.preventDefault();
      event.stopPropagation();
      clear();
      void api.clear({
        threadId: thread,
        terminalId: DEFAULT_TERMINAL_ID,
      });
      return false;
    });

    data = next.onData((chunk) => {
      void api.write({
        threadId: thread,
        terminalId: DEFAULT_TERMINAL_ID,
        data: chunk,
      });
    });

    const onEvent = (event: TerminalEvent) => {
      if (!live) return;
      if (event.threadId !== thread) return;
      if (event.terminalId !== DEFAULT_TERMINAL_ID) return;
      if (event.type === "output") {
        next.write(event.data);
        return;
      }
      if (event.type === "cleared") {
        clear();
        return;
      }
      if (event.type === "started" || event.type === "restarted") {
        clear();
      }
    };

    off = api.onEvent(onEvent);

    void api
      .open({
        threadId: thread,
        terminalId: DEFAULT_TERMINAL_ID,
        cwd,
        cols: next.cols,
        rows: next.rows,
      })
      .then((snap) => {
        if (!live) return;
        hydrate(snap.history);
      })
      .catch((err) => {
        if (dev) console.warn("[TerminalPanel] terminal.open failed", err);
        if (live) setBootErr("Could not open terminal session.");
      });

    return () => {
      live = false;
      off?.();
      data?.dispose();
      next?.dispose();
      term.current = null;
      fit.current = null;
      size.current = null;
      el.replaceChildren();
    };
  }, [dev, ghost, mode, props.cwd, props.environmentId, view]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const addon = fit.current;
      const next = term.current;
      const api = readWorkbenchTerminalApi(props.environmentId);
      if (!addon || !next || !api || !props.cwd) return;
      addon.fit();
      const thread = workbenchThreadId(props.cwd);
      const prev = size.current;
      if (prev && prev.thread === thread && prev.cols === next.cols && prev.rows === next.rows) {
        return;
      }
      size.current = { thread, cols: next.cols, rows: next.rows };
      void api.resize({
        threadId: thread,
        terminalId: DEFAULT_TERMINAL_ID,
        cols: next.cols,
        rows: next.rows,
      });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [props.cwd, props.environmentId]);

  if (!props.cwd) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center">
        <p className="text-body text-muted-foreground/60">No workspace open</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground"
      style={style}
    >
      {bootErr ? (
        <p className="shrink-0 px-2 py-1 text-detail text-destructive">{bootErr}</p>
      ) : null}
      <div ref={ref} className="min-h-0 flex-1 overflow-hidden px-2 py-1" style={style} />
    </div>
  );
}
