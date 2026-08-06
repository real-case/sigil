import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBarChartTool, BAR_CHART_UI_URI } from "./tools/bar-chart.js";
import { registerLineChartTool, LINE_CHART_UI_URI } from "./tools/line-chart.js";
import { registerPieChartTool, PIE_CHART_UI_URI } from "./tools/pie-chart.js";
import { registerTableTool, TABLE_UI_URI } from "./tools/table.js";
import {
  registerScatterChartTool,
  SCATTER_CHART_UI_URI,
} from "./tools/scatter-chart.js";
import { registerTreemapTool, TREEMAP_UI_URI } from "./tools/treemap.js";
import { registerHeatmapTool, HEATMAP_UI_URI } from "./tools/heatmap.js";
import { registerStatPanelTool, STAT_PANEL_UI_URI } from "./tools/stat-panel.js";
import { registerSankeyTool, SANKEY_UI_URI } from "./tools/sankey.js";
import { registerDashboardTool, DASHBOARD_UI_URI } from "./tools/dashboard.js";
import { registerMapTool, MAP_UI_URI } from "./tools/map.js";

export interface WidgetEntry {
  name: string;
  uri: string;
  register: (server: McpServer) => void;
}

export const WIDGETS: readonly WidgetEntry[] = [
  { name: "bar-chart", uri: BAR_CHART_UI_URI, register: registerBarChartTool },
  { name: "line-chart", uri: LINE_CHART_UI_URI, register: registerLineChartTool },
  { name: "pie-chart", uri: PIE_CHART_UI_URI, register: registerPieChartTool },
  { name: "table", uri: TABLE_UI_URI, register: registerTableTool },
  { name: "scatter-chart", uri: SCATTER_CHART_UI_URI, register: registerScatterChartTool },
  { name: "treemap", uri: TREEMAP_UI_URI, register: registerTreemapTool },
  { name: "heatmap", uri: HEATMAP_UI_URI, register: registerHeatmapTool },
  { name: "stat-panel", uri: STAT_PANEL_UI_URI, register: registerStatPanelTool },
  { name: "sankey", uri: SANKEY_UI_URI, register: registerSankeyTool },
  { name: "dashboard", uri: DASHBOARD_UI_URI, register: registerDashboardTool },
  { name: "map", uri: MAP_UI_URI, register: registerMapTool },
] as const;
