import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { tableSchema } from "../shared/schemas.js";
import type { TablePayload } from "../shared/payloads.js";

export const TABLE_UI_URI = "ui://sigil/table";

const description = [
  "Render an interactive data table with sortable columns and text-search filtering.",
  "Use when the user needs to explore, compare, or drill into structured tabular data — especially when specific values and cross-row comparison matter more than visual pattern recognition.",
  "Columns support left/right/center alignment; numeric values are detected and sorted numerically.",
  "Declare a column with kind 'sparkline' to show an inline trend per row (e.g. recent history like the last 12 weeks): its cells are then arrays of numbers ordered oldest to newest, rendered as a small line with the latest value beside it.",
  "Prefer a chart (bar/line/pie) when the goal is visual insight at a glance.",
].join(" ");

export function registerTableTool(server: McpServer) {
  registerAppTool(
    server,
    "render_table",
    {
      title: "Data Table",
      description,
      inputSchema: tableSchema.shape,
      _meta: { ui: { resourceUri: TABLE_UI_URI } },
    },
    async (args) => {
      const payload: TablePayload = {
        title: args.title,
        columns: args.columns,
        rows: args.rows,
        sortable: args.sortable ?? true,
        filterable: args.filterable ?? true,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
