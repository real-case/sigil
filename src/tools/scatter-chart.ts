import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { ScatterChartPayload } from "../shared/payloads.js";

export const SCATTER_CHART_UI_URI = "ui://sigil/scatter-chart";

const description = [
  "Render an interactive scatter plot showing the relationship between two numeric variables.",
  "Use for correlation analysis, cluster visualization, or any (x, y) distribution.",
  "Supports multiple series overlaid in the same coordinate space and an optional point size encoding a third metric.",
  "For comparing discrete categories use render_bar_chart; for time-series use render_line_chart.",
].join(" ");

const inputSchema = {
  title: z.string().min(1).describe("Chart title shown above the plot."),
  series: z
    .array(
      z.object({
        name: z.string().min(1).describe("Series name shown in the legend and tooltip."),
        data: z
          .array(
            z.object({
              x: z.number().describe("Numeric x coordinate."),
              y: z.number().describe("Numeric y coordinate."),
              size: z
                .number()
                .positive()
                .optional()
                .describe(
                  "Optional point size in arbitrary units; encodes a third numeric variable. If omitted, points use a uniform size.",
                ),
            }),
          )
          .min(1)
          .describe("Data points for this series. Provide at least one point."),
      }),
    )
    .min(1)
    .describe("One or more series. Each renders in a distinct color from the palette."),
  xlabel: z.string().optional().describe("Label for the x-axis."),
  ylabel: z.string().optional().describe("Label for the y-axis."),
};

export function registerScatterChartTool(server: McpServer) {
  registerAppTool(
    server,
    "render_scatter_chart",
    {
      title: "Scatter Plot",
      description,
      inputSchema,
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
