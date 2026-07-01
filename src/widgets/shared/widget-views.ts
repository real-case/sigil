import type { ComponentType } from "react";
import type { DashboardTileType } from "../../shared/payloads.js";
import { BarChartView } from "../bar-chart/BarChartView.js";
import { LineChartView } from "../line-chart/LineChartView.js";
import { PieChartView } from "../pie-chart/PieChartView.js";
import { TableView } from "../table/TableView.js";
import { ScatterChartView } from "../scatter-chart/ScatterChartView.js";
import { TreemapView } from "../treemap/TreemapView.js";
import { HeatmapView } from "../heatmap/HeatmapView.js";
import { StatPanelView } from "../stat-panel/StatPanelView.js";

// Production map of widget type → presentational View, used by the dashboard
// widget to render child tiles. Imports only `*View` modules (side-effect free)
// — never the `App.tsx` entries, which call `mountWidget` on import. The
// dashboard itself is intentionally absent (no dashboard-in-dashboard).
type AnyView = ComponentType<{ payload: never }>;

export const WIDGET_VIEWS: Record<DashboardTileType, AnyView> = {
  "bar-chart": BarChartView as unknown as AnyView,
  "line-chart": LineChartView as unknown as AnyView,
  "pie-chart": PieChartView as unknown as AnyView,
  table: TableView as unknown as AnyView,
  "scatter-chart": ScatterChartView as unknown as AnyView,
  treemap: TreemapView as unknown as AnyView,
  heatmap: HeatmapView as unknown as AnyView,
  "stat-panel": StatPanelView as unknown as AnyView,
};
