import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { infoCardSchema } from "../shared/schemas.js";
import type { InfoCardPayload } from "../shared/payloads.js";

export const INFO_CARD_UI_URI = "ui://sigil/info-card";

const description = [
  "Render a compact card that puts a value in context: against a target, a threshold, the other entries, or an earlier period.",
  "Pick `variant`: 'bullet' (actual vs target with qualitative bands — several KPIs against plan), 'gauge' (a dial with ok / warning / critical zones — uptime, utilisation, NPS), 'progress' (a bar filling towards a goal or quota), 'ranking' (a leaderboard / top-N with share meters and ▲▼ rank changes), 'comparison' (value vs baseline with the change), 'narrative' (a short written summary with optional key figures).",
  "Use whenever the user asks 'are we on target', 'how close to the goal', 'is it healthy', 'top 10', 'leaderboard', or 'how does it compare with last year'.",
  "For headline KPIs with sparklines and deltas, use render_stat_panel; for a full category comparison, use render_bar_chart.",
].join(" ");

export function registerInfoCardTool(server: McpServer) {
  registerAppTool(
    server,
    "render_info_card",
    {
      title: "Info Card",
      description,
      inputSchema: infoCardSchema.shape,
      _meta: { ui: { resourceUri: INFO_CARD_UI_URI } },
    },
    async (args) => {
      // `.shape` cannot carry the cross-field rules (items for every variant
      // but narrative, a baseline per comparison item), so the handler runs
      // the whole schema and names the rule on failure.
      const checked = infoCardSchema.safeParse(args);
      if (!checked.success) throw new Error(z.prettifyError(checked.error));
      const payload: InfoCardPayload = {
        title: args.title,
        variant: args.variant,
        items: args.items,
        text: args.text,
        currentLabel: args.currentLabel,
        baselineLabel: args.baselineLabel,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
