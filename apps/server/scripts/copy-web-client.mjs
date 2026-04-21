import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const webDist = join(repoRoot, "apps", "web", "dist");
const target = join(repoRoot, "apps", "server", "dist", "client");

if (!existsSync(webDist)) {
  console.error(`[copy-web-client] Missing ${webDist}. Build apps/web first.`);
  process.exit(1);
}

mkdirSync(target, { recursive: true });
cpSync(webDist, target, { recursive: true });
console.log(`[copy-web-client] Copied web dist to ${target}`);
