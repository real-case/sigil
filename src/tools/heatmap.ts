import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { HeatmapPayload } from "../shared/payloads.js";

export const HEATMAP_UI_URI = "ui://sigil/heatmap";

const description = [
  "Render an interactive heatmap matrix: a 2D grid where each cell's color encodes a numeric intensity.",
  "Use for two categorical axes plus one metric — correlation matrices, day-of-week × hour-of-day activity, confusion matrices, A/B test results across segments.",
  "Cells in the lower range stay near the surface color; cells near the maximum saturate toward the primary palette color.",
  "Negative and positive values are supported — any range works.",
].join(" ");

const inputSchema = {
  title: z.string().min(1).describe("Chart title shown above the matrix."),
  xLabels: z
    .array(z.string().min(1))
    .min(1)
    .describe("Column labels along the x-axis (one per matrix column)."),
  yLabels: z
    .array(z.string().min(1))
    .min(1)
    .describe("Row labels along the y-axis (one per matrix row)."),
  cells: z
    .array(
      z.object({
        x: z.number().int().nonnegative().describe("Column index into xLabels (0-based)."),
        y: z.number().int().nonnegative().describe("Row index into yLabels (0-based)."),
        value: z.number().describe("Numeric intensity for this cell."),
      }),
    )
    .min(1)
    .describe(
      "Cells of the matrix. Missing (x, y) combinations are rendered empty. Out-of-range indices are ignored.",
    ),
  xlabel: z.string().optional().describe("Axis label for the x-axis."),
  ylabel: z.string().optional().describe("Axis label for the y-axis."),
};

export function registerHeatmapTool(server: McpServer) {
  registerAppTool(
    server,
    "render_heatmap",
    {
      title: "Heatmap",
      description,
      inputSchema,
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
