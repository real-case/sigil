import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { funnelSchema } from "../shared/schemas.js";
import type { FunnelPayload } from "../shared/payloads.js";

export const FUNNEL_UI_URI = "ui://sigil/funnel";

const description = [
  "Render an interactive conversion funnel: ordered stages (visit → sign-up → activation → purchase) as bars sized by how many reached each one.",
  "Every stage shows its conversion from the first stage and from the previous one; the largest drop between two stages is called out.",
  "Use whenever the user says funnel, conversion, drop-off or pipeline stages, or the data is a count that can only shrink stage by stage.",
  "Pass stages first to last, with the count that reached each; optional conversionTime per stage.",
  "For flows that branch or merge, use render_sankey; for unordered categories, use render_bar_chart.",
].join(" ");

export function registerFunnelTool(server: McpServer) {
  registerAppTool(
    server,
    "render_funnel",
    {
      title: "Funnel",
      description,
      inputSchema: funnelSchema.shape,
      _meta: { ui: { resourceUri: FUNNEL_UI_URI } },
    },
    async (args) => {
      const payload: FunnelPayload = {
        title: args.title,
        followUps: args.followUps,
        steps: args.steps,
        orientation: args.orientation ?? "horizontal",
        showDropOff: args.showDropOff ?? true,
        valueLabel: args.valueLabel,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
