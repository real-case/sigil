import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { distributionSchema } from "../shared/schemas.js";
import type { DistributionPayload } from "../shared/payloads.js";

export const DISTRIBUTION_UI_URI = "ui://sigil/distribution";

const description = [
  "Render how one numeric measure is DISTRIBUTED: a histogram of bucket counts, or box plots comparing spread across groups.",
  "Use when the user asks about a distribution, spread, percentiles, skew, outliers, 'how many fall between', latency or response-time profiles, order-value or session-length ranges, or compares variability between groups (regions, versions, cohorts).",
  "Pass raw `values` per group and the widget computes buckets or quartiles; or pass pre-computed `bins` (histogram) or a five-number `summary` (box) when only aggregates are available.",
  "Add `markers` for an SLO, a target or a limit on the value axis.",
  "For the relationship between two measures use render_scatter_chart; for a measure over time use render_line_chart; for totals per category use render_bar_chart.",
].join(" ");

export function registerDistributionTool(server: McpServer) {
  registerAppTool(
    server,
    "render_distribution",
    {
      title: "Distribution",
      description,
      inputSchema: distributionSchema.shape,
      _meta: { ui: { resourceUri: DISTRIBUTION_UI_URI } },
    },
    async (args) => {
      // `.shape` cannot carry the cross-field rules (each group needs data the
      // variant can use), so the handler runs the whole schema.
      const checked = distributionSchema.safeParse(args);
      if (!checked.success) throw new Error(z.prettifyError(checked.error));
      const payload: DistributionPayload = {
        title: args.title,
        followUps: args.followUps,
        variant: args.variant ?? "histogram",
        groups: args.groups,
        binCount: args.binCount,
        valueLabel: args.valueLabel,
        markers: args.markers,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
