import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { SankeyPayload } from "../shared/payloads.js";

export const SANKEY_UI_URI = "ui://sigil/sankey";

const description = [
  "Render an interactive sankey (flow) diagram: ribbons between stages whose width is proportional to the flow value.",
  "Use for source-to-destination data — where a budget goes, how users move through a product, traffic sources to outcomes, energy or material transfers.",
  "Links reference nodes by name; nodes may be listed explicitly to fix order or colors, otherwise they are derived from the links.",
  "Flows must be acyclic (no path may loop back to an earlier node).",
  "For stage-by-stage drop-off without branching, a bar chart may be simpler; for part-of-whole composition, prefer render_pie_chart or render_treemap.",
].join(" ");

const inputSchema = {
  title: z.string().min(1).describe("Chart title shown above the diagram."),
  nodes: z
    .array(
      z.object({
        name: z
          .string()
          .min(1)
          .describe("Unique node name; links reference nodes by this name."),
        color: z
          .string()
          .optional()
          .describe(
            "Optional CSS color override for this node and its outgoing links. Defaults to the palette.",
          ),
      }),
    )
    .optional()
    .describe(
      "Optional explicit node list controlling column order and colors. When omitted, nodes are derived from the links in first-appearance order.",
    ),
  links: z
    .array(
      z.object({
        source: z.string().min(1).describe("Name of the node this flow leaves."),
        target: z.string().min(1).describe("Name of the node this flow enters."),
        value: z
          .number()
          .nonnegative()
          .describe("Non-negative flow magnitude; controls the ribbon width."),
      }),
    )
    .min(1)
    .describe("Directed flows between nodes. The graph must be acyclic."),
  valueLabel: z
    .string()
    .optional()
    .describe('Optional label for the flow value in the tooltip, e.g. "users".'),
};

export function registerSankeyTool(server: McpServer) {
  registerAppTool(
    server,
    "render_sankey",
    {
      title: "Sankey",
      description,
      inputSchema,
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
