import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "mcpcharts",
    version: "0.1.0",
  });
  registerAllTools(server);
  registerAllResources(server);
  return server;
}
