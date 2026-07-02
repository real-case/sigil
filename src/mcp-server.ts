import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { SIGIL_VERSION } from "./version.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "sigil",
    version: SIGIL_VERSION,
  });
  registerAllTools(server);
  registerAllResources(server);
  return server;
}
