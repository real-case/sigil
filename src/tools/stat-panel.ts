import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { statPanelSchema } from "../shared/schemas.js";
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

export function registerStatPanelTool(server: McpServer) {
  registerAppTool(
    server,
    "render_stat_panel",
    {
      title: "Stat Panel",
      description,
      inputSchema: statPanelSchema.shape,
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
