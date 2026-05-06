import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { WIDGETS } from "../registry.js";

function findPackageRoot(start: string): string {
  let current = start;
  while (current !== dirname(current)) {
    if (existsSync(join(current, "package.json"))) return current;
    current = dirname(current);
  }
  throw new Error(`package.json not found searching up from ${start}`);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = findPackageRoot(HERE);
const WIDGETS_DIR = join(PACKAGE_ROOT, "dist", "widgets");

const htmlCache = new Map<string, string>();

function loadWidgetHtml(name: string): string {
  const cached = htmlCache.get(name);
  if (cached) return cached;
  const file = join(WIDGETS_DIR, name, "index.html");
  if (!existsSync(file)) {
    throw new Error(
      `Widget bundle missing at ${file}. Run 'npm run build:widgets'.`,
    );
  }
  const html = readFileSync(file, "utf-8");
  htmlCache.set(name, html);
  return html;
}

export function registerAllResources(server: McpServer) {
  for (const widget of WIDGETS) {
    registerAppResource(
      server,
      widget.name,
      widget.uri,
      { mimeType: RESOURCE_MIME_TYPE },
      async (uri) => ({
        contents: [
          {
            uri: uri.toString(),
            mimeType: RESOURCE_MIME_TYPE,
            text: loadWidgetHtml(widget.name),
          },
        ],
      }),
    );
  }
}
