import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { barChartSchema } from "../shared/schemas.js";
import type { BarChartPayload } from "../shared/payloads.js";

export const BAR_CHART_UI_URI = "ui://sigil/bar-chart";

const description = [
  "Render an interactive bar chart for comparing discrete categories or showing rankings.",
  "Supports vertical and horizontal orientations, hover tooltips, and click-to-highlight.",
  "Use for categorical data (e.g. sales by region, votes by option, count by status).",
  "For time-series or continuous trends, use render_line_chart instead.",
  "For part-of-whole proportions, use render_pie_chart instead.",
].join(" ");


export function registerBarChartTool(server: McpServer) {
  registerAppTool(
    server,
    "render_bar_chart",
    {
      title: "Bar Chart",
      description,
      inputSchema: barChartSchema.shape,
      _meta: { ui: { resourceUri: BAR_CHART_UI_URI } },
    },
    async (args) => {
      const payload: BarChartPayload = {
        title: args.title,
        data: args.data,
        orientation: args.orientation ?? "vertical",
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
