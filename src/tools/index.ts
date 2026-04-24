import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBarChartTool } from "./bar-chart.js";
import { registerLineChartTool } from "./line-chart.js";
import { registerPieChartTool } from "./pie-chart.js";
import { registerTableTool } from "./table.js";

export function registerAllTools(server: McpServer) {
  registerBarChartTool(server);
  registerLineChartTool(server);
  registerPieChartTool(server);
  registerTableTool(server);
}
