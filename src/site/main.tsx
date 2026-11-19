import { createRoot } from "react-dom/client";
import { installThemeStyles, renderForcedThemeCss } from "../widgets/shared/theme.js";
import { Site } from "./Site.js";
import "../widgets/shared/styles.css";
import "./site.css";

// Same token pipeline the widgets use: prefers-color-scheme by default, and a
// `<html data-sigil-theme>` override for the header's theme switch.
installThemeStyles();
if (!document.getElementById("sigil-forced-theme")) {
  const el = document.createElement("style");
  el.id = "sigil-forced-theme";
  el.textContent = renderForcedThemeCss();
  document.head.appendChild(el);
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Site />);
