import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { pieChartSchema } from "../shared/schemas.js";
import type { PieChartPayload } from "../shared/payloads.js";

export const PIE_CHART_UI_URI = "ui://sigil/pie-chart";

const description = [
  "Render an interactive pie or donut chart.",
  "Use for part-of-whole proportions: market share, budget breakdown, distribution by category, survey results.",
  "Hover a slice to see its exact percentage and value; click to highlight a single slice.",
  "Slices beyond maxSegments (default 5) collapse into a single muted 'Other' slice the viewer can click to expand — set maxSegments higher when the user asks to see more or all categories (CSV export always keeps every row).",
  "Defaults to donut (inner hole) — use variant='pie' for a solid pie when exact center emphasis matters.",
  "For ranking or comparing independent categories, use render_bar_chart instead.",
].join(" ");

export function registerPieChartTool(server: McpServer) {
  registerAppTool(
    server,
    "render_pie_chart",
    {
      title: "Pie Chart",
      description,
      inputSchema: pieChartSchema.shape,
      _meta: { ui: { resourceUri: PIE_CHART_UI_URI } },
    },
    async (args) => {
      const payload: PieChartPayload = {
        title: args.title,
        data: args.data,
        variant: args.variant ?? "donut",
        maxSegments: args.maxSegments,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
