import type { ComponentType } from "react";
import { BarChartView } from "../../bar-chart/BarChartView.js";
import { LineChartView } from "../../line-chart/LineChartView.js";
import { PieChartView } from "../../pie-chart/PieChartView.js";
import { TableView } from "../../table/TableView.js";
import { ScatterChartView } from "../../scatter-chart/ScatterChartView.js";
import { HeatmapView } from "../../heatmap/HeatmapView.js";
import { TreemapView } from "../../treemap/TreemapView.js";
import { StatPanelView } from "../../stat-panel/StatPanelView.js";
import { DashboardView } from "../../dashboard/DashboardView.js";
import type { Dataset } from "./types.js";
import { barDatasets } from "./bar.js";
import { lineDatasets } from "./line.js";
import { pieDatasets } from "./pie.js";
import { tableDatasets } from "./table.js";
import { scatterDatasets } from "./scatter.js";
import { heatmapDatasets } from "./heatmap.js";
import { treemapDatasets } from "./treemap.js";
import { statPanelDatasets } from "./stat-panel.js";
import { dashboardDatasets } from "./dashboard.js";

export type WidgetKey =
  | "bar-chart"
  | "line-chart"
  | "pie-chart"
  | "table"
  | "scatter-chart"
  | "heatmap"
  | "treemap"
  | "stat-panel"
  | "dashboard";

// `View` and `datasets` are linked by the same payload type `P` at
// construction (via `defineEntry` below), but the registry array stores
// heterogeneous widgets — we erase `P` here and re-link them at render.
export interface WidgetEntry {
  key: WidgetKey;
  label: string;
  View: ComponentType<{ payload: never }>;
  datasets: Dataset<never>[];
}

function defineEntry<P>(args: {
  key: WidgetKey;
  label: string;
  View: ComponentType<{ payload: P }>;
  datasets: Dataset<P>[];
}): WidgetEntry {
  return args as unknown as WidgetEntry;
}

export const WIDGET_ENTRIES: WidgetEntry[] = [
  defineEntry({ key: "bar-chart", label: "Bar chart", View: BarChartView, datasets: barDatasets }),
  defineEntry({ key: "line-chart", label: "Line chart", View: LineChartView, datasets: lineDatasets }),
  defineEntry({ key: "pie-chart", label: "Pie / donut", View: PieChartView, datasets: pieDatasets }),
  defineEntry({ key: "table", label: "Table", View: TableView, datasets: tableDatasets }),
  defineEntry({ key: "scatter-chart", label: "Scatter", View: ScatterChartView, datasets: scatterDatasets }),
  defineEntry({ key: "heatmap", label: "Heatmap", View: HeatmapView, datasets: heatmapDatasets }),
  defineEntry({ key: "treemap", label: "Treemap", View: TreemapView, datasets: treemapDatasets }),
  defineEntry({ key: "stat-panel", label: "Stat panel", View: StatPanelView, datasets: statPanelDatasets }),
  defineEntry({ key: "dashboard", label: "Dashboard", View: DashboardView, datasets: dashboardDatasets }),
];
