import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { BarChartPayload } from "../shared/payloads.js";

export const BAR_CHART_UI_URI = "ui://mcpcharts/bar-chart";

const description = [
  "Render an interactive bar chart for comparing discrete categories or showing rankings.",
  "Supports vertical and horizontal orientations, hover tooltips, and click-to-highlight.",
  "Use for categorical data (e.g. sales by region, votes by option, count by status).",
  "For time-series or continuous trends, use render_line_chart instead.",
  "For part-of-whole proportions, use render_pie_chart instead.",
].join(" ");

const inputSchema = {
  title: z.string().min(1).describe("Chart title shown above the bars."),
  data: z
    .array(
      z.object({
        label: z
          .string()
          .min(1)
          .describe("Category label (x-axis for vertical, y-axis for horizontal)."),
        value: z.number().describe("Numeric value controlling bar length."),
        color: z
          .string()
          .optional()
          .describe(
            "Optional CSS color override for this bar (e.g. '#6366F1'). If omitted, uses the theme palette.",
          ),
      }),
    )
    .min(1)
    .describe("Array of bars. Provide at least one data point."),
  orientation: z
    .enum(["vertical", "horizontal"])
    .optional()
    .describe("Bar orientation. Defaults to 'vertical'."),
  xlabel: z.string().optional().describe("Label for the x-axis."),
  ylabel: z.string().optional().describe("Label for the y-axis."),
};

export function registerBarChartTool(server: McpServer) {
  registerAppTool(
    server,
    "render_bar_chart",
    {
      title: "Bar Chart",
      description,
      inputSchema,
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
