import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { EmptyStatePayload } from "../shared/payloads.js";

export const EMPTY_STATE_UI_URI = "ui://sigil/empty-state";

const description = [
  "Render an empty-state placeholder card.",
  "Use when a query returns no rows, when data is loading, or when an action is needed before charts can render.",
].join(" ");

const inputSchema = {
  title: z.string().min(1).describe("Heading shown in bold."),
  message: z.string().min(1).describe("Supporting message below the heading."),
};

export function registerEmptyStateTool(server: McpServer) {
  registerAppTool(
    server,
    "render_empty_state",
    {
      title: "Empty State",
      description,
      inputSchema,
      _meta: { ui: { resourceUri: EMPTY_STATE_UI_URI } },
    },
    async (args) => {
      const payload: EmptyStatePayload = {
        title: args.title,
        message: args.message,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    },
  );
}
