import type { StorybookConfig } from "@storybook/react-vite";
import type { Plugin } from "vite";
import { fileURLToPath } from "node:url";

// Rollup cannot resolve `file://`-scheme import specifiers in the production
// build. @storybook/addon-docs sets the MDX `providerImportSource` via
// `import.meta.resolve(...)`, which yields a `file://` URL — so every MDX page
// fails `build:storybook` (dev works because Vite's dev server tolerates it).
// This pre-resolver rewrites such ids back to filesystem paths. This is the
// "genuinely required" plugin the spec sanctions for `viteFinal`.
const resolveFileUrlImports: Plugin = {
  name: "sigil-resolve-file-url-imports",
  enforce: "pre",
  resolveId(id) {
    if (id.startsWith("file://")) {
      // `?? id` is required by noUncheckedIndexedAccess (split()[0] is typed
      // string | undefined); a provider `file://` id never carries a query.
      return fileURLToPath(id.split("?")[0] ?? id);
    }
    return null;
  },
};

// Stable CSF 3 config (not the experimental CSF Next `defineMain`). `main.ts`
// and `preview.tsx` deliberately use the same type-annotation style.
const config: StorybookConfig = {
  stories: [
    "../src/stories/**/*.mdx",
    "../src/widgets/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-themes",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    // builder-vite otherwise auto-loads the repo root vite.config.ts (which is
    // WIDGET=-rooted + applies vite-plugin-singlefile). Point it at an empty
    // config so the widget build pipeline never leaks into Storybook.
    options: { builder: { viteConfigPath: ".storybook/vite.config.ts" } },
  },
  // The only viteFinal addition is the file:// resolver above (for addon-docs'
  // MDX provider import). Storybook supplies its own Vite builder config.
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), resolveFileUrlImports],
  }),
};

export default config;
