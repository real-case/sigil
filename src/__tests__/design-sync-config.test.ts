// Drift pin for .design-sync/config.json: the hand-maintained dtsPropsFor
// payload-type strings must keep naming the live tool surface. Expectations
// derive from the tools' actual input schemas over the in-memory protocol —
// not from the config itself — so a payload change that forgets the config
// fails here. This is exactly the drift that occurred at specs 002
// (maxSegments) and 004 (column kind), both silent at the time.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../mcp-server.js";
import { WIDGETS } from "../registry.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");

const config = JSON.parse(
  readFileSync(join(REPO_ROOT, ".design-sync", "config.json"), "utf8"),
) as { dtsPropsFor: Record<string, string> };

const toolName = (widget: string) => `render_${widget.replaceAll("-", "_")}`;

// "bar-chart" → "BarChartView"; derived rather than read from titleMap so
// this test does not couple to Storybook naming.
const viewKey = (widget: string) =>
  widget
    .split("-")
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("") + "View";

// A property counts as present only as a declaration-ish token — the name
// followed by an optional "?" and a colon — so one-letter names (x, y)
// cannot false-pass as substrings of unrelated words.
const declares = (dts: string, name: string) =>
  new RegExp(`\\b${name}\\??:`).test(dts);

type SchemaNode = {
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
};

let client!: Client;

beforeAll(async () => {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "sigil-design-sync-pin", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterAll(async () => {
  await client?.close();
});

describe("design-sync config payload types", () => {
  it("names every live schema property in each View's dts string", async () => {
    const { tools } = await client.listTools();
    const missing: string[] = [];

    for (const w of WIDGETS) {
      const tool = tools.find((t) => t.name === toolName(w.name));
      expect(tool, `tool ${toolName(w.name)} not registered`).toBeTruthy();
      const dts = config.dtsPropsFor[viewKey(w.name)];
      expect(dts, `dtsPropsFor.${viewKey(w.name)} missing`).toBeTruthy();

      const props = (tool!.inputSchema as SchemaNode).properties ?? {};
      for (const [name, node] of Object.entries(props)) {
        if (!declares(dts!, name)) missing.push(`${viewKey(w.name)}: ${name}`);
        // One level into array-of-object items — catches nested column/datum
        // properties like the table's `kind`.
        for (const nested of Object.keys(node.items?.properties ?? {})) {
          if (!declares(dts!, nested)) {
            missing.push(`${viewKey(w.name)}: ${name}[].${nested}`);
          }
        }
      }
    }

    expect(missing, ".design-sync/config.json dtsPropsFor is stale").toEqual([]);
  });

  it("TableView dts carries the sparkline column surface", () => {
    const dts = config.dtsPropsFor["TableView"]!;
    expect(dts).toContain('kind?: "text" | "sparkline"');
    expect(dts).toContain("number[]");
  });

  it("PieChartView dts carries maxSegments", () => {
    expect(config.dtsPropsFor["PieChartView"]!).toContain("maxSegments");
  });
});
