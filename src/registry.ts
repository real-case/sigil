import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBarChartTool, BAR_CHART_UI_URI } from "./tools/bar-chart.js";
import { registerLineChartTool, LINE_CHART_UI_URI } from "./tools/line-chart.js";
import { registerPieChartTool, PIE_CHART_UI_URI } from "./tools/pie-chart.js";
import { registerTableTool, TABLE_UI_URI } from "./tools/table.js";

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
] as const;
