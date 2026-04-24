import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { TablePayload } from "../shared/payloads.js";

export const TABLE_UI_URI = "ui://mcpcharts/table";

const description = [
  "Render an interactive data table with sortable columns and text-search filtering.",
  "Use when the user needs to explore, compare, or drill into structured tabular data — especially when specific values and cross-row comparison matter more than visual pattern recognition.",
  "Columns support left/right/center alignment; numeric values are detected and sorted numerically.",
  "Prefer a chart (bar/line/pie) when the goal is visual insight at a glance.",
].join(" ");

const inputSchema = {
  title: z.string().min(1).describe("Table title shown above the rows."),
  columns: z
    .array(
      z.object({
        key: z
          .string()
          .min(1)
          .describe("Property name in each row matching this column's cell."),
        label: z.string().min(1).describe("Human-readable column header."),
        align: z
          .enum(["left", "right", "center"])
          .optional()
          .describe(
            "Cell alignment. Defaults to 'right' for numeric columns, 'left' otherwise.",
          ),
      }),
    )
    .min(1)
    .describe("Column definitions in display order."),
  rows: z
    .array(z.record(z.string(), z.union([z.string(), z.number()])))
    .describe("Rows as objects keyed by column.key. Empty is allowed."),
  sortable: z
    .boolean()
    .optional()
    .describe("Enable click-to-sort on column headers. Defaults to true."),
  filterable: z
    .boolean()
    .optional()
    .describe("Show a case-insensitive search box above the table. Defaults to true."),
};

export function registerTableTool(server: McpServer) {
  registerAppTool(
    server,
    "render_table",
    {
      title: "Data Table",
      description,
      inputSchema,
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
