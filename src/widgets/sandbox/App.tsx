import { createRoot } from "react-dom/client";
import { installThemeStyles, renderForcedThemeCss } from "../shared/theme.js";
import { Sandbox } from "./Sandbox.js";
import "../shared/styles.css";
import "./sandbox.css";

installThemeStyles();

// Inject the forced-theme override CSS once. The sandbox toggles
// `<html data-sigil-theme="…">` to drive it.
if (typeof document !== "undefined" && !document.getElementById("sigil-forced-theme")) {
  const el = document.createElement("style");
  el.id = "sigil-forced-theme";
  el.textContent = renderForcedThemeCss();
  document.head.appendChild(el);
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Sandbox />);
