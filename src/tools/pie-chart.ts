import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { PieChartPayload } from "../shared/payloads.js";

export const PIE_CHART_UI_URI = "ui://mcpcharts/pie-chart";

const description = [
  "Render an interactive pie or donut chart.",
  "Use for part-of-whole proportions: market share, budget breakdown, distribution by category, survey results.",
  "Hover a slice to see its exact percentage and value; click to highlight a single slice.",
  "Defaults to donut (inner hole) — use variant='pie' for a solid pie when exact center emphasis matters.",
  "For ranking or comparing independent categories, use render_bar_chart instead.",
].join(" ");

const inputSchema = {
  title: z.string().min(1).describe("Chart title shown above the pie."),
  data: z
    .array(
      z.object({
        label: z.string().min(1).describe("Slice label shown in the tooltip and legend."),
        value: z
          .number()
          .nonnegative()
          .describe("Slice value (non-negative). Percentages are computed as value / sum."),
        color: z
          .string()
          .optional()
          .describe(
            "Optional CSS color override for this slice (e.g. '#6366F1'). If omitted, uses the theme palette.",
          ),
      }),
    )
    .min(1)
    .describe("Slices of the pie. Provide at least one positive-valued entry."),
  variant: z
    .enum(["pie", "donut"])
    .optional()
    .describe("Chart variant. Defaults to 'donut'."),
};

export function registerPieChartTool(server: McpServer) {
  registerAppTool(
    server,
    "render_pie_chart",
    {
      title: "Pie Chart",
      description,
      inputSchema,
      _meta: { ui: { resourceUri: PIE_CHART_UI_URI } },
    },
    async (args) => {
      const payload: PieChartPayload = {
        title: args.title,
        data: args.data,
        variant: args.variant ?? "donut",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
