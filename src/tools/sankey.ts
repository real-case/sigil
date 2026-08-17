import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { sankeySchema } from "../shared/schemas.js";
import type { SankeyPayload } from "../shared/payloads.js";

export const SANKEY_UI_URI = "ui://sigil/sankey";

const description = [
  "Render an interactive sankey (flow) diagram: ribbons between stages whose width is proportional to the flow value.",
  "Use for source-to-destination data — where a budget goes, how users move through a product, traffic sources to outcomes, energy or material transfers.",
  "Links reference nodes by name; nodes may be listed explicitly to fix order or colors, otherwise they are derived from the links.",
  "Flows must be acyclic (no path may loop back to an earlier node).",
  "For stage-by-stage drop-off without branching, a bar chart may be simpler; for part-of-whole composition, prefer render_pie_chart or render_treemap.",
].join(" ");

export function registerSankeyTool(server: McpServer) {
  registerAppTool(
    server,
    "render_sankey",
    {
      title: "Sankey",
      description,
      inputSchema: sankeySchema.shape,
      _meta: { ui: { resourceUri: SANKEY_UI_URI } },
    },
    async (args) => {
      const payload: SankeyPayload = {
        title: args.title,
        nodes: args.nodes,
        links: args.links,
        valueLabel: args.valueLabel,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
