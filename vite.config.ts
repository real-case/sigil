import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";
import { WIDGETS } from "./src/registry.js";

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf8"),
) as { version: string };

const PRODUCTION_WIDGETS = WIDGETS.map((w) => w.name);
const DEV_ONLY_WIDGETS = ["palette-preview", "sandbox"] as const;
const ALL_WIDGETS: readonly string[] = [...PRODUCTION_WIDGETS, ...DEV_ONLY_WIDGETS];

const widget = process.env.WIDGET ?? "bar-chart";
if (!ALL_WIDGETS.includes(widget)) {
  throw new Error(
    `Unknown WIDGET="${widget}". Expected one of: ${ALL_WIDGETS.join(", ")}`,
  );
}

export default defineConfig({
  root: resolve(__dirname, `src/widgets/${widget}`),
  define: { __SIGIL_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: resolve(__dirname, `dist/widgets/${widget}`),
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 2_000,
  },
});
