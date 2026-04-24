import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

const widgets = ["bar-chart", "line-chart", "pie-chart", "table"] as const;

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist/widgets",
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        widgets.map((w) => [w, resolve(__dirname, `src/widgets/${w}/index.html`)]),
      ),
    },
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 2_000,
  },
});
