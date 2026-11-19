import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { heatmapSchema } from "../shared/schemas.js";
import type { HeatmapPayload } from "../shared/payloads.js";

export const HEATMAP_UI_URI = "ui://sigil/heatmap";

const description = [
  "Render an interactive heatmap matrix: a 2D grid where each cell's color encodes a numeric intensity.",
  "Use for two categorical axes plus one metric — correlation matrices, day-of-week × hour-of-day activity, confusion matrices, A/B test results across segments.",
  "By default a sequential single-hue scale runs light (low) to dark (high).",
  "For values with a meaningful centre (change vs target, growth, correlation), set scale 'diverging' and, if the centre is not 0, midpoint.",
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
        scale: args.scale,
        midpoint: args.midpoint,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
