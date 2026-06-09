import type { Preview } from "@storybook/react-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import {
  installThemeStyles,
  renderForcedThemeCss,
} from "../src/widgets/shared/theme.js";
import "../src/widgets/shared/styles.css";

// Inject base tokens + the forced-theme override CSS once, exactly as the
// sandbox's App.tsx does. The decorator below flips `data-sigil-theme`.
// Guard both DOM-touching calls: `build:storybook` / addon-docs may evaluate
// this module in a Node pass, and `installThemeStyles()` touches `document`.
if (typeof document !== "undefined") {
  installThemeStyles();
  if (!document.getElementById("sigil-forced-theme")) {
    const el = document.createElement("style");
    el.id = "sigil-forced-theme";
    el.textContent = renderForcedThemeCss();
    document.head.appendChild(el);
  }
}

const preview: Preview = {
  parameters: {
    layout: "padded",
    // Deliberate sidebar order for the catalog: docs first (Introduction
    // leading), then the widget stories.
    options: {
      storySort: {
        order: [
          "Docs",
          ["Introduction", "Design Tokens", "Theming", "MCP Integration"],
          "Widgets",
        ],
      },
    },
    // v10 viewport API: an `options` map here, selection via `initialGlobals`.
    // Presets mirror the sandbox breakpoints so the two tools agree.
    viewport: {
      options: {
        m320: { name: "320 — mobile", styles: { width: "320px", height: "640px" } },
        m480: { name: "480 — large phone", styles: { width: "480px", height: "720px" } },
        m768: { name: "768 — tablet", styles: { width: "768px", height: "900px" } },
        m1024: { name: "1024 — desktop", styles: { width: "1024px", height: "768px" } },
      },
    },
  },
  // Sibling of `parameters` — pre-selects the desktop preset on load.
  initialGlobals: {
    viewport: { value: "m1024", isRotated: false },
  },
  decorators: [
    withThemeByDataAttribute({
      attributeName: "data-sigil-theme",
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
    }),
  ],
};

export default preview;
