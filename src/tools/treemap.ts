import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { treemapSchema } from "../shared/schemas.js";
import type { TreemapPayload } from "../shared/payloads.js";

export const TREEMAP_UI_URI = "ui://sigil/treemap";

const description = [
  "Render an interactive treemap showing hierarchical part-of-whole data as nested rectangles sized by value.",
  "Use for many-leaf compositions where a pie chart would be unreadable: file-system size by directory, market share by ticker, budget by category, etc.",
  "Supports nested groupings; top-level items are colored from the palette and child rectangles inherit a tint.",
  "For flat 5-15 category proportions, prefer render_pie_chart. For ranking discrete categories, prefer render_bar_chart.",
].join(" ");

export function registerTreemapTool(server: McpServer) {
  registerAppTool(
    server,
    "render_treemap",
    {
      title: "Treemap",
      description,
      inputSchema: treemapSchema.shape,
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
