import { randomUUID } from "node:crypto";
import cors from "cors";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./mcp-server.js";
import { SIGIL_VERSION } from "./version.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "127.0.0.1";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

// Browser pages may only call this server from localhost origins, plus any
// origin listed in ALLOWED_ORIGINS (comma-separated, exact match). Requests
// without an Origin header (CLI / desktop MCP clients) always pass.
const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  return LOCALHOST_ORIGIN.test(origin) || EXTRA_ORIGINS.includes(origin);
}

async function main() {
  const app = createMcpExpressApp({ host: HOST });

  // The MCP Streamable HTTP spec requires Origin validation: the SDK's Host
  // check stops DNS rebinding, this stops direct cross-site fetches from
  // arbitrary web pages hitting a dev server on localhost.
  app.use((req, res, next) => {
    if (!originAllowed(req.headers.origin)) {
      res.status(403).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Forbidden: origin not allowed" },
        id: null,
      });
      return;
    }
    next();
  });
  app.use(
    cors({
      origin: (origin, cb) => cb(null, originAllowed(origin ?? undefined)),
      exposedHeaders: ["Mcp-Session-Id"],
    }),
  );

  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      // Only an initialize request may open a new session; anything else with
      // an unknown or stale session id gets a clean error instead of a fresh
      // silently-created server (which also let the transports map grow
      // without bound).
      if (sessionId || !isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: unknown or missing session id" },
          id: null,
        });
        return;
      }
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
    res.json({ ok: true, name: "sigil", version: SIGIL_VERSION });
  });

  app.listen(PORT, HOST, () => {
    if (!LOOPBACK_HOSTS.has(HOST)) {
      console.warn(
        `[sigil] binding to ${HOST}: the server has no authentication — keep it behind a trusted proxy and set ALLOWED_ORIGINS for browser clients`,
      );
    }
    console.log(`sigil listening on http://${HOST}:${PORT}/mcp`);
  });
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
