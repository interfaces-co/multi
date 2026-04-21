import { useEffect, useRef, useState } from "react";

function resolveWsUrl(): string {
  const configured = import.meta.env.VITE_WS_URL?.trim();
  if (configured) return configured;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws`;
}

export function App() {
  const wsUrl = resolveWsUrl();
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("connecting");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    const onOpen = () => setStatus("open");
    const onClose = () => setStatus("closed");
    const onError = () => setStatus("error");
    const onMessage = (ev: MessageEvent) => {
      try {
        const j = JSON.parse(String(ev.data)) as {
          channel?: string;
          line?: string;
          status?: string;
          message?: string;
        };
        if (j.channel === "codex.raw" && typeof j.line === "string") {
          setLines((prev) => [...prev, j.line!]);
        } else if (j.channel === "server.status") {
          setLines((prev) => [
            ...prev,
            `[server.status] ${String(j.status)}${j.message ? ` ${j.message}` : ""}`,
          ]);
        } else {
          setLines((prev) => [...prev, String(ev.data)]);
        }
      } catch {
        setLines((prev) => [...prev, String(ev.data)]);
      }
    };
    ws.addEventListener("open", onOpen);
    ws.addEventListener("close", onClose);
    ws.addEventListener("error", onError);
    ws.addEventListener("message", onMessage);
    return () => {
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("close", onClose);
      ws.removeEventListener("error", onError);
      ws.removeEventListener("message", onMessage);
      ws.close();
    };
  }, [wsUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="min-h-screen bg-neutral-950 p-4 font-mono text-sm text-neutral-100">
      <header className="mb-3 border-b border-neutral-800 pb-2 text-neutral-400">
        <div>WebSocket: {status}</div>
        <div className="break-all text-xs">{wsUrl}</div>
      </header>
      <pre className="max-h-[calc(100vh-6rem)] overflow-y-auto whitespace-pre-wrap break-all">
        {lines.join("\n")}
        <div ref={bottomRef} />
      </pre>
    </div>
  );
}
