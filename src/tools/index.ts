import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBarChartTool } from "./bar-chart.js";

export function registerAllTools(server: McpServer) {
  registerBarChartTool(server);
  // #13 line-chart, #14 pie-chart, #15 table will slot in here.
}
