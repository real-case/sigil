import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { dashboardSchema } from "../shared/schemas.js";
import type { DashboardPayload } from "../shared/payloads.js";

export const DASHBOARD_UI_URI = "ui://sigil/dashboard";

const description = [
  "Render a multi-widget dashboard: a grid of tiles where each tile is one of",
  "the other Sigil widgets (bar-chart, line-chart, pie-chart, table,",
  "scatter-chart, treemap, heatmap, stat-panel, sankey, map, funnel,",
  "info-card, distribution, timeline).",
  "Use to show several related views at once — e.g. a KPI row above a couple of",
  "charts. Each tile's `payload` is exactly what that widget's own render_* tool",
  "takes; `type` selects the widget. Put a stat-panel first for a KPI header.",
  "Group tiles under headings with sections, and say where the numbers come",
  "from with `source` / `asOf`. `columns` is a maximum: the grid narrows itself",
  "on small screens. For service health (RED / USE), SaaS KPIs or product",
  "analytics, follow the templates described on `tiles`.",
].join(" ");

export function registerDashboardTool(server: McpServer) {
  registerAppTool(
    server,
    "render_dashboard",
    {
      title: "Dashboard",
      description,
      inputSchema: dashboardSchema.shape,
      _meta: { ui: { resourceUri: DASHBOARD_UI_URI } },
    },
    async (args) => {
      const payload: DashboardPayload = {
        title: args.title,
        columns: args.columns,
        tiles: args.tiles as DashboardPayload["tiles"],
        note: args.note,
        source: args.source,
        asOf: args.asOf,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
