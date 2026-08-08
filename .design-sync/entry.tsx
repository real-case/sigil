// Design-system bundle entry for /design-sync.
//
// Sigil ships interactive MCP widgets, not a conventional component library,
// so there is no compiled component `dist/`. The converter bundles THIS module
// (via `--entry`, esbuild-compiled from source) into `window.Sigil.*`. Each
// widget's presentational `*View` component is re-exported under its real name
// so the Storybook compare harness — which redirects a story's relative
// `./<Name>View.js` import to `window.Sigil.<Name>View` by matching the file
// basename against this bundle's exports — renders the shipped bundle, not a
// duplicate source copy. Keep the `*View` names exactly as the widgets export
// them; renaming would break that redirect (see .design-sync/NOTES.md).
import { useState, type ReactNode } from "react";
import { installThemeStyles } from "../src/widgets/shared/theme.js";

// Theme wrapper used as cfg.provider. Sigil's Storybook themes previews via
// `.storybook/preview.tsx` (installThemeStyles + the addon-themes decorator),
// but that decorator can't be bundled for static previews (esbuild's __toESM
// interop defeats the addon stub), so we distill the part that matters here:
// installThemeStyles() injects the base `--sigil-*` tokens onto `:root`,
// exactly as preview.tsx does. The lazy useState initializer runs it once,
// synchronously, before children paint. Tokens also ship statically via
// .design-sync/tokens.css so designs are themed without this provider; this
// keeps preview parity with Storybook and is harmless (installThemeStyles is
// idempotent). See .design-sync/NOTES.md.
export function SigilThemeProvider({ children }: { children?: ReactNode }) {
  useState(() => {
    installThemeStyles();
    return null;
  });
  return children as ReactNode;
}

export { BarChartView } from "../src/widgets/bar-chart/BarChartView.js";
export { LineChartView } from "../src/widgets/line-chart/LineChartView.js";
export { PieChartView } from "../src/widgets/pie-chart/PieChartView.js";
export { TableView } from "../src/widgets/table/TableView.js";
export { HeatmapView } from "../src/widgets/heatmap/HeatmapView.js";
export { ScatterChartView } from "../src/widgets/scatter-chart/ScatterChartView.js";
export { TreemapView } from "../src/widgets/treemap/TreemapView.js";
export { StatPanelView } from "../src/widgets/stat-panel/StatPanelView.js";
export { SankeyView } from "../src/widgets/sankey/SankeyView.js";
export { DashboardView } from "../src/widgets/dashboard/DashboardView.js";
export { MapView } from "../src/widgets/map/MapView.js";
