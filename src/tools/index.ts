import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WIDGETS } from "../registry.js";

export function registerAllTools(server: McpServer) {
  for (const widget of WIDGETS) {
    widget.register(server);
  }
}
