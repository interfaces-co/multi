import { resolvePrimaryEnvironmentHttpUrl } from "~/environments/primary";

type BrowserDebugLevel = "debug" | "info" | "warn" | "error";

interface BrowserDebugEvent {
  readonly name: string;
  readonly level: BrowserDebugLevel;
  readonly at: string;
  readonly href: string;
  readonly pathname: string;
  readonly visibilityState: DocumentVisibilityState;
  readonly data?: Readonly<Record<string, unknown>>;
}

const MAX_BATCH_SIZE = 25;
const FLUSH_DELAY_MS = 75;

let queue: BrowserDebugEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInstalled = false;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "string" || typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (depth >= 3) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, entry]) => [key, sanitizeValue(entry, depth + 1)]),
    );
  }
  return String(value);
}

function sanitizeData(data: Readonly<Record<string, unknown>> | undefined) {
  if (!data) {
    return undefined;
  }
  return sanitizeValue(data) as Readonly<Record<string, unknown>>;
}

function makeEvent(
  name: string,
  data?: Readonly<Record<string, unknown>>,
  level: BrowserDebugLevel = "info",
): BrowserDebugEvent {
  const event: BrowserDebugEvent = {
    name,
    level,
    at: new Date().toISOString(),
    href: window.location.href,
    pathname: window.location.pathname,
    visibilityState: document.visibilityState,
  };
  if (data) {
    const sanitizedData = sanitizeData(data);
    return sanitizedData ? { ...event, data: sanitizedData } : event;
  }
  return event;
}

function resolveDebugEventsUrl(): string | null {
  try {
    return resolvePrimaryEnvironmentHttpUrl("/api/debug/browser-events");
  } catch {
    return null;
  }
}

function sendEvents(events: ReadonlyArray<BrowserDebugEvent>, keepalive = false): void {
  const url = resolveDebugEventsUrl();
  if (!url || events.length === 0) {
    return;
  }

  const body = JSON.stringify({ events });
  if (keepalive && navigator.sendBeacon) {
    const payload = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(url, payload)) {
      return;
    }
  }

  void fetch(url, {
    body,
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    keepalive,
    method: "POST",
  }).catch(() => undefined);
}

function flush(keepalive = false): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const events = queue;
  queue = [];
  sendEvents(events, keepalive);
}

function scheduleFlush(): void {
  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
    return;
  }
  if (flushTimer) {
    return;
  }
  flushTimer = setTimeout(() => flush(), FLUSH_DELAY_MS);
}

export function traceBrowserEvent(
  name: string,
  data?: Readonly<Record<string, unknown>>,
  level: BrowserDebugLevel = "info",
): void {
  if (typeof window === "undefined") {
    return;
  }
  queue.push(makeEvent(name, data, level));
  scheduleFlush();
}

export function installBrowserDebugTracing(): void {
  if (listenersInstalled || typeof window === "undefined") {
    return;
  }
  listenersInstalled = true;

  traceBrowserEvent("app.browser-debug.installed", {
    userAgent: navigator.userAgent,
  });

  window.addEventListener("error", (event) => {
    traceBrowserEvent(
      "window.error",
      {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      },
      "error",
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    traceBrowserEvent(
      "window.unhandledrejection",
      {
        reason: event.reason,
      },
      "error",
    );
  });

  window.addEventListener("beforeunload", () => {
    traceBrowserEvent("window.beforeunload");
    flush(true);
  });
}
