import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { lineChartSchema } from "../shared/schemas.js";
import type { LineChartPayload } from "../shared/payloads.js";

export const LINE_CHART_UI_URI = "ui://sigil/line-chart";

const description = [
  "Render an interactive line chart with one or more series.",
  "Use for time-series, trends, progress tracking, or any continuous numeric data across an ordered x-axis.",
  "Supports multiple series overlay with a shared crosshair tooltip that reveals all values at the hovered x.",
  "For discrete category comparison, use render_bar_chart.",
  "For part-of-whole proportions, use render_pie_chart.",
].join(" ");

export function registerLineChartTool(server: McpServer) {
  registerAppTool(
    server,
    "render_line_chart",
    {
      title: "Line Chart",
      description,
      inputSchema: lineChartSchema.shape,
      _meta: { ui: { resourceUri: LINE_CHART_UI_URI } },
    },
    async (args) => {
      const payload: LineChartPayload = {
        title: args.title,
        series: args.series,
        xlabel: args.xlabel,
        ylabel: args.ylabel,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
