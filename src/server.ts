import { randomUUID } from "node:crypto";
import cors from "cors";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./mcp-server.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "127.0.0.1";

async function main() {
  const app = createMcpExpressApp({ host: HOST });
  app.use(cors({ exposedHeaders: ["Mcp-Session-Id"] }));

  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.set(id, transport!);
          console.log(`[${id}] session initialized`);
        },
      });
      transport.onclose = () => {
        if (transport?.sessionId) transports.delete(transport.sessionId);
      };
      await createServer().connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, name: "mcpcharts", version: "0.1.0" });
  });

  app.listen(PORT, HOST, () => {
    console.log(`mcpcharts listening on http://${HOST}:${PORT}/mcp`);
  });
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
