import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/bin.ts"],
  format: "esm",
  platform: "node",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  noExternal: (id) => id.startsWith("@multi/"),
  banner: {
    js: "#!/usr/bin/env node\n",
  },
});
