import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { barChartSchema } from "../shared/schemas.js";
import type { BarChartPayload } from "../shared/payloads.js";

export const BAR_CHART_UI_URI = "ui://sigil/bar-chart";

const description = [
  "Render an interactive bar chart for comparing discrete categories or showing rankings.",
  "Supports vertical and horizontal orientations, hover tooltips, and click-to-highlight.",
  "Pass `series` instead of `data` for several values per category: grouped side by side (stack 'none'), stacked to a total ('normal', negatives go below zero), or stacked to 100% ('percent').",
  "A series with mark 'line' draws a line over the bars on the same axis (e.g. a target or average); a right-hand axis is for a different unit only and needs ylabelRight.",
  "Add `reference` for target lines, thresholds and goal bands.",
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
      // The host validates against `.shape`, which cannot carry the
      // cross-field rules (data XOR series, right axis needs its label), so
      // the handler runs the whole schema. Throwing makes an isError result
      // naming the rule, which the model can act on.
      const checked = barChartSchema.safeParse(args);
      if (!checked.success) throw new Error(z.prettifyError(checked.error));
      const payload: BarChartPayload = args.series
        ? {
            title: args.title,
            series: args.series,
            stack: args.stack ?? "none",
            orientation: args.orientation ?? "vertical",
            xlabel: args.xlabel,
            ylabel: args.ylabel,
            ylabelRight: args.ylabelRight,
            reference: args.reference,
          }
        : {
            title: args.title,
            data: args.data,
            orientation: args.orientation ?? "vertical",
            xlabel: args.xlabel,
            ylabel: args.ylabel,
            reference: args.reference,
          };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
