import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };

const port = Number(process.env.PORT ?? 5733);
const host = process.env.HOST?.trim() || "localhost";
const configuredWsUrl = process.env.VITE_WS_URL?.trim();

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "import.meta.env.VITE_WS_URL": JSON.stringify(configuredWsUrl ?? ""),
    "import.meta.env.APP_VERSION": JSON.stringify(pkg.version),
  },
  server: {
    host,
    port,
    strictPort: true,
    proxy: configuredWsUrl
      ? (() => {
          try {
            const u = new URL(
              configuredWsUrl.startsWith("ws")
                ? configuredWsUrl.replace(/^ws/, "http")
                : configuredWsUrl,
            );
            const target = `${u.protocol}//${u.host}`;
            return {
              "/ws": { target, ws: true, changeOrigin: true },
            };
          } catch {
            return {};
          }
        })()
      : {},
  },
  build: {
    sourcemap: true,
  },
});
