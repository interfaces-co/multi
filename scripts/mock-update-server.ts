import { createReadStream, existsSync, realpathSync } from "node:fs";
import * as http from "node:http";
import { resolve, relative } from "node:path";

const port = Number(process.env.MULTI_DESKTOP_MOCK_UPDATE_SERVER_PORT ?? 3000);
const root =
  process.env.MULTI_DESKTOP_MOCK_UPDATE_SERVER_ROOT ??
  resolve(import.meta.dirname, "..", "release-mock");

const mockServerLog = (level: "info" | "warn" | "error" = "info", message: string) => {
  console[level](`[mock-update-server] ${message}`);
};

function isWithinRoot(filePath: string): boolean {
  try {
    return !relative(realpathSync(root), realpathSync(filePath)).startsWith(".");
  } catch (error) {
    mockServerLog("error", `Error checking if file is within root: ${error}`);
    return false;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const pathname = url.pathname;
  mockServerLog("info", `Request received for path: ${pathname}`);
  const filePath = resolve(root, `.${pathname}`);
  if (!isWithinRoot(filePath)) {
    mockServerLog("warn", `Attempted to access file outside of root: ${filePath}`);
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }
  if (!existsSync(filePath)) {
    mockServerLog("warn", `Attempted to access non-existent file: ${filePath}`);
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }
  mockServerLog("info", `Serving file: ${filePath}`);
  createReadStream(filePath).pipe(res);
});

server.listen(port, "localhost", () => {
  mockServerLog("info", `running on http://localhost:${port}`);
});
