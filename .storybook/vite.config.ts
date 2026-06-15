import { defineConfig } from "vite";

// Intentionally empty config (no plugins) — this file is only a redirect
// target. @storybook/builder-vite auto-loads a project Vite config
// from the repo root; the root vite.config.ts is WIDGET=-rooted and applies
// vite-plugin-singlefile (it inlines the whole app into one HTML and roots into
// a single widget dir) plus its own react() plugin — all wrong for a
// multi-component Storybook. `.storybook/main.ts` points builder-vite here via
// `viteConfigPath` so none of that leaks in; Storybook supplies its own builder
// config (react plugin, etc.) through the framework preset.
export default defineConfig({});
