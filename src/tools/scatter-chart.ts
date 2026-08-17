import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { scatterChartSchema } from "../shared/schemas.js";
import type { ScatterChartPayload } from "../shared/payloads.js";

export const SCATTER_CHART_UI_URI = "ui://sigil/scatter-chart";

const description = [
  "Render an interactive scatter plot showing the relationship between two numeric variables.",
  "Use for correlation analysis, cluster visualization, or any (x, y) distribution.",
  "Supports multiple series overlaid in the same coordinate space and an optional point size encoding a third metric.",
  "For comparing discrete categories use render_bar_chart; for time-series use render_line_chart.",
].join(" ");

export function registerScatterChartTool(server: McpServer) {
  registerAppTool(
    server,
    "render_scatter_chart",
    {
      title: "Scatter Plot",
      description,
      inputSchema: scatterChartSchema.shape,
      _meta: { ui: { resourceUri: SCATTER_CHART_UI_URI } },
    },
    async (args) => {
      const payload: ScatterChartPayload = {
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
