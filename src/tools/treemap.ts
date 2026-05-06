import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { TreemapPayload, TreemapNode } from "../shared/payloads.js";

export const TREEMAP_UI_URI = "ui://sigil/treemap";

const description = [
  "Render an interactive treemap showing hierarchical part-of-whole data as nested rectangles sized by value.",
  "Use for many-leaf compositions where a pie chart would be unreadable: file-system size by directory, market share by ticker, budget by category, etc.",
  "Supports nested groupings; top-level items are colored from the palette and child rectangles inherit a tint.",
  "For flat 5-15 category proportions, prefer render_pie_chart. For ranking discrete categories, prefer render_bar_chart.",
].join(" ");

const treemapNodeSchema: z.ZodType<TreemapNode> = z.lazy(() =>
  z.object({
    label: z.string().min(1).describe("Node label shown in the rectangle and tooltip."),
    value: z
      .number()
      .nonnegative()
      .describe(
        "Numeric value controlling rectangle area. For parents with children, may be omitted (set to 0) — sum of children is used.",
      ),
    color: z
      .string()
      .optional()
      .describe("Optional CSS color override for this node. Defaults to the palette."),
    children: z
      .array(treemapNodeSchema)
      .optional()
      .describe("Optional nested nodes for hierarchical data."),
  }),
);

const inputSchema = {
  title: z.string().min(1).describe("Chart title shown above the treemap."),
  data: z
    .array(treemapNodeSchema)
    .min(1)
    .describe("Top-level nodes. Each may have nested children for hierarchical layouts."),
};

export function registerTreemapTool(server: McpServer) {
  registerAppTool(
    server,
    "render_treemap",
    {
      title: "Treemap",
      description,
      inputSchema,
      _meta: { ui: { resourceUri: TREEMAP_UI_URI } },
    },
    async (args) => {
      const payload: TreemapPayload = {
        title: args.title,
        data: args.data,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
