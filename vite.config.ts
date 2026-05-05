import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

export const WIDGETS = [
  "bar-chart",
  "line-chart",
  "pie-chart",
  "table",
  "palette-preview", // dev-only — not built into production via build:widgets script
] as const;
export type Widget = (typeof WIDGETS)[number];

const widget = (process.env.WIDGET ?? "bar-chart") as Widget;
if (!WIDGETS.includes(widget)) {
  throw new Error(
    `Unknown WIDGET="${widget}". Expected one of: ${WIDGETS.join(", ")}`,
  );
}

export default defineConfig({
  root: resolve(__dirname, `src/widgets/${widget}`),
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: resolve(__dirname, `dist/widgets/${widget}`),
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 2_000,
  },
});
