import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

import type { WsCodexRawPush, WsServerStatusPush } from "@multi/contracts";
import open from "open";
import { WebSocket, WebSocketServer } from "ws";

import { CodexRawPipe } from "./codex-raw-pipe";

export interface RawServerOptions {
  readonly port: number;
  readonly host: string;
  readonly staticDir: string | undefined;
  readonly codexBinary: string;
  readonly cwd: string;
  readonly openBrowser: boolean;
}

function contentType(file: string): string {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function serveStatic(root: string, req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1).replaceAll("..", "");
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(path.normalize(root))) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  const send = (p: string) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType(p));
    fs.createReadStream(p).pipe(res);
  };

  fs.stat(file, (err, st) => {
    if (!err && st.isFile()) {
      send(file);
      return;
    }
    const index = path.join(root, "index.html");
    fs.stat(index, (e2, st2) => {
      if (!e2 && st2.isFile()) {
        send(index);
      } else {
        res.statusCode = 404;
        res.end("Not found");
      }
    });
  });
}

function broadcast(wss: WebSocketServer, msg: WsCodexRawPush | WsServerStatusPush): void {
  const s = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(s);
  }
}

export async function startRawServer(options: RawServerOptions): Promise<void> {
  const wss = new WebSocketServer({ noServer: true });

  const server = http.createServer((req, res) => {
    if (!options.staticDir) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Multi raw server: set MULTI_STATIC_DIR or pass --static-dir to serve the web UI.");
      return;
    }
    serveStatic(options.staticDir, req, res);
  });

  server.on("upgrade", (req, socket, head) => {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  let pipe: CodexRawPipe | undefined;

  const startCodex = () => {
    pipe?.stop();
    broadcast(wss, {
      channel: "server.status",
      status: "codex_starting",
      message: "Spawning codex app-server",
    });
    pipe = new CodexRawPipe(
      (line) => {
        broadcast(wss, { channel: "codex.raw", line });
      },
      (chunk) => {
        broadcast(wss, {
          channel: "codex.raw",
          line: `[stderr] ${chunk.trimEnd()}`,
        });
      },
    );
    void pipe
      .start({ cwd: options.cwd, binaryPath: options.codexBinary })
      .then(() => {
        broadcast(wss, { channel: "server.status", status: "codex_ready" });
      })
      .catch((err) => {
        broadcast(wss, {
          channel: "server.status",
          status: "codex_error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  };

  wss.on("connection", () => {
    /* single shared Codex pipe; connection receives broadcast stream */
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(options.port, options.host, () => resolve());
    server.on("error", reject);
  });

  startCodex();

  if (options.openBrowser && options.staticDir) {
    const httpUrl = `http://${options.host}:${options.port}/`;
    void open(httpUrl).catch(() => undefined);
  }

  const shutdown = () => {
    pipe?.stop();
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
