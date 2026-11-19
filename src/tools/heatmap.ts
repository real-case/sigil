import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { heatmapSchema } from "../shared/schemas.js";
import type { HeatmapPayload } from "../shared/payloads.js";

export const HEATMAP_UI_URI = "ui://sigil/heatmap";

const description = [
  "Render an interactive heatmap matrix: a 2D grid where each cell's color encodes a numeric intensity.",
  "Use for two categorical axes plus one metric — correlation matrices, day-of-week × hour-of-day activity, confusion matrices, A/B test results across segments.",
  "By default a sequential single-hue scale runs light (low) to dark (high).",
  "For values with a meaningful centre (change vs target, growth, correlation), set scale 'diverging' and, if the centre is not 0, midpoint.",
  "For retention or cohort tables (signup month × months since signup), set mode 'cohort': cells are percentages, cohortSizes weights the average row, and periods a cohort has not reached are simply omitted.",
  "For one value per day over weeks to years (daily commits, orders, incidents, sign-ins), set mode 'calendar' and pass `days` as { date: 'YYYY-MM-DD', value } instead of the matrix fields.",
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
      // `.shape` cannot carry the cross-field rules (one cohort size per row,
      // matrix fields versus calendar days),
      // so the handler runs the whole schema and names the rule on failure.
      const checked = heatmapSchema.safeParse(args);
      if (!checked.success) throw new Error(z.prettifyError(checked.error));
      const payload: HeatmapPayload = {
        title: args.title,
        followUps: args.followUps,
        xLabels: args.xLabels,
        yLabels: args.yLabels,
        cells: args.cells,
        xlabel: args.xlabel,
        ylabel: args.ylabel,
        scale: args.scale,
        midpoint: args.midpoint,
        mode: args.mode,
        cohortSizes: args.cohortSizes,
        days: args.days,
        weekStart: args.weekStart,
        valueLabel: args.valueLabel,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
