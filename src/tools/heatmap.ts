import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { heatmapSchema } from "../shared/schemas.js";
import type { HeatmapPayload } from "../shared/payloads.js";

export const HEATMAP_UI_URI = "ui://sigil/heatmap";

const description = [
  "Render an interactive heatmap matrix: a 2D grid where each cell's color encodes a numeric intensity.",
  "Use for two categorical axes plus one metric — correlation matrices, day-of-week × hour-of-day activity, confusion matrices, A/B test results across segments.",
  "Cells in the lower range stay near the surface color; cells near the maximum saturate toward the primary palette color.",
  "Negative and positive values are supported — any range works.",
].join(" ");

export function registerHeatmapTool(server: McpServer) {
  registerAppTool(
    server,
    "render_heatmap",
    {
      title: "Heatmap",
      description,
      inputSchema: heatmapSchema.shape,
      _meta: { ui: { resourceUri: HEATMAP_UI_URI } },
    },
    async (args) => {
      const payload: HeatmapPayload = {
        title: args.title,
        xLabels: args.xLabels,
        yLabels: args.yLabels,
        cells: args.cells,
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
