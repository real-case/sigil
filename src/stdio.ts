#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./mcp-server.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Keep the process alive until the host closes stdin.
}

main().catch((err) => {
  // stderr is the only safe channel — stdout is the MCP transport.
  console.error("sigil stdio fatal:", err);
  process.exit(1);
});
