import { spawn, type ChildProcessWithoutNullStreams, spawnSync } from "node:child_process";
import readline from "node:readline";

const INIT_PARAMS = {
  clientInfo: { name: "multi_raw", title: "Multi Raw", version: "0.1.0" },
  capabilities: { experimentalApi: true },
} as const;

function killCodexChildProcess(child: ChildProcessWithoutNullStreams): void {
  if (process.platform === "win32" && child.pid !== undefined) {
    try {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      return;
    } catch {
      /* fall through */
    }
  }
  child.kill();
}

export class CodexRawPipe {
  private child: ChildProcessWithoutNullStreams | undefined;
  private readonly pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private nextId = 1;

  constructor(
    private readonly onStdoutLine: (line: string) => void,
    private readonly onStderrChunk: (chunk: string) => void,
  ) {}

  async start(input: { readonly cwd: string; readonly binaryPath: string }): Promise<void> {
    const child = spawn(input.binaryPath, ["app-server"], {
      cwd: input.cwd,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    this.child = child;

    const output = readline.createInterface({ input: child.stdout });
    output.on("line", (line) => this.handleLine(line));
    child.stderr.on("data", (buf) => this.onStderrChunk(String(buf)));

    await this.request("initialize", INIT_PARAMS);
    this.notify("initialized", {});
    await this.request("thread/start", {
      cwd: input.cwd,
      experimentalRawEvents: true,
    });
  }

  private handleLine(line: string): void {
    this.onStdoutLine(line);
    try {
      const msg = JSON.parse(line) as {
        id?: number;
        result?: unknown;
        error?: { message?: string };
      };
      if (msg.id === undefined) return;
      const id = Number(msg.id);
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      if (msg.error) {
        p.reject(new Error(msg.error.message ?? "Codex JSON-RPC error"));
      } else {
        p.resolve(msg.result);
      }
    } catch {
      /* non-json line already forwarded */
    }
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const child = this.child;
    if (!child?.stdin.writable) {
      return Promise.reject(new Error("Codex stdin is not writable"));
    }
    const id = this.nextId++;
    const payload = `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      child.stdin.write(payload);
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`Codex RPC timeout: ${method}`));
      }, 120_000);
    });
  }

  private notify(method: string, params: unknown): void {
    const child = this.child;
    if (!child?.stdin.writable) return;
    const payload = `${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`;
    child.stdin.write(payload);
  }

  stop(): void {
    if (this.child) {
      killCodexChildProcess(this.child);
      this.child = undefined;
    }
    this.pending.clear();
  }
}
