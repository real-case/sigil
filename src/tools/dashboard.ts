import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { DashboardPayload } from "../shared/payloads.js";

export const DASHBOARD_UI_URI = "ui://sigil/dashboard";

const description = [
  "Render a multi-widget dashboard: a grid of tiles where each tile is one of",
  "the other Sigil widgets (bar-chart, line-chart, pie-chart, table,",
  "scatter-chart, treemap, heatmap, stat-panel).",
  "Use to show several related views at once — e.g. a KPI row above a couple of",
  "charts. Each tile's `payload` is exactly what that widget's own render_* tool",
  "takes; `type` selects the widget. Put a stat-panel first for a KPI header.",
].join(" ");

const inputSchema = {
  title: z.string().min(1).describe("Dashboard title shown above the tiles."),
  columns: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .describe("Grid column count. Defaults to 2."),
  tiles: z
    .array(
      z.object({
        type: z
          .enum([
            "bar-chart",
            "line-chart",
            "pie-chart",
            "table",
            "scatter-chart",
            "treemap",
            "heatmap",
            "stat-panel",
          ])
          .describe("Which widget to render in this tile."),
        payload: z
          .record(z.string(), z.unknown())
          .describe(
            "The referenced widget's own payload — the same object its render_<type> tool accepts (e.g. a bar-chart tile takes { title, data, orientation }).",
          ),
        colSpan: z
          .number()
          .int()
          .min(1)
          .max(4)
          .optional()
          .describe("How many columns this tile spans (1..columns). Defaults to 1."),
      }),
    )
    .min(1)
    .describe("Ordered list of tiles laid out left-to-right, top-to-bottom."),
};

export function registerDashboardTool(server: McpServer) {
  registerAppTool(
    server,
    "render_dashboard",
    {
      title: "Dashboard",
      description,
      inputSchema,
      _meta: { ui: { resourceUri: DASHBOARD_UI_URI } },
    },
    async (args) => {
      const payload: DashboardPayload = {
        title: args.title,
        columns: args.columns,
        tiles: args.tiles as DashboardPayload["tiles"],
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
