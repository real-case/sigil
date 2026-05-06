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
] as const;
