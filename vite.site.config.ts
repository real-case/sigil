import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The project website (sigil.live). Unlike the widgets it is an ordinary
// multi-asset static site — no single-file inlining — and it renders the
// production widget views directly from source with the sandbox datasets.
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf8"),
) as { version: string };

export default defineConfig({
  root: resolve(__dirname, "src/site"),
  publicDir: resolve(__dirname, "src/site/public"),
  define: { __SIGIL_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "dist-site"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2_000,
  },
});
