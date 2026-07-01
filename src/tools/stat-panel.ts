import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { StatPanelPayload } from "../shared/payloads.js";

export const STAT_PANEL_UI_URI = "ui://sigil/stat-panel";

const description = [
  "Render an interactive panel of key metrics (KPI / scorecard cards).",
  "Each card shows a headline value with an optional unit, a trend delta vs a",
  "prior period (coloured good/bad), a short description, and a status accent.",
  "Use for dashboards-at-a-glance: KPIs, health summaries, before/after numbers.",
  "For comparing many categories use render_bar_chart; for trends over time use",
  "render_line_chart.",
].join(" ");

const inputSchema = {
  title: z.string().min(1).describe("Panel title shown above the metric cards."),
  items: z
    .array(
      z.object({
        label: z.string().min(1).describe("Metric name, e.g. 'Active users'."),
        value: z
          .union([z.string(), z.number()])
          .describe(
            "Headline figure. Numbers are grouped/formatted; pass a string to control formatting yourself.",
          ),
        unit: z
          .string()
          .optional()
          .describe("Unit shown after the value, e.g. 'ms', '%', 'GB'."),
        delta: z
          .number()
          .optional()
          .describe(
            "Signed change vs the comparison period; shows a coloured up/down arrow.",
          ),
        deltaUnit: z
          .string()
          .optional()
          .describe("Unit for the delta. Defaults to '%'."),
        deltaCaption: z
          .string()
          .optional()
          .describe("Caption beside the delta, e.g. 'vs last week'."),
        higherIsBetter: z
          .boolean()
          .optional()
          .describe(
            "Whether a rising value is good — controls delta colour. Defaults to true.",
          ),
        description: z
          .string()
          .optional()
          .describe("Small caption under the value."),
        status: z
          .enum(["success", "warning", "danger", "info"])
          .optional()
          .describe("Optional semantic accent bar on the card."),
        trend: z
          .array(z.number())
          .optional()
          .describe(
            "Recent values (oldest→newest) drawn as a compact sparkline at the bottom of the card.",
          ),
        target: z
          .number()
          .optional()
          .describe(
            "Goal for the metric; with a numeric value, draws a progress bar toward this target.",
          ),
        badge: z
          .string()
          .optional()
          .describe("Short status pill shown next to the label, coloured by `status`."),
      }),
    )
    .min(1)
    .describe("Array of metric cards. Provide at least one."),
  columns: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .describe("Optional fixed column count (1–4). Defaults to an auto-fit grid."),
};

export function registerStatPanelTool(server: McpServer) {
  registerAppTool(
    server,
    "render_stat_panel",
    {
      title: "Stat Panel",
      description,
      inputSchema,
      _meta: { ui: { resourceUri: STAT_PANEL_UI_URI } },
    },
    async (args) => {
      const payload: StatPanelPayload = {
        title: args.title,
        items: args.items,
        columns: args.columns,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
