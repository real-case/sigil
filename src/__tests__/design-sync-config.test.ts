// Drift pin for the hand-maintained /design-sync wiring: the dtsPropsFor
// payload-type strings must keep naming the live tool surface, and every widget
// in the registry must be reachable from the bundle entry + titleMap.
// Expectations derive from the tools' actual input schemas over the in-memory
// protocol — not from the config itself — so a payload change that forgets the
// config fails here. This is exactly the drift that occurred at specs 002
// (maxSegments) and 004 (column kind), both silent at the time; the sankey
// widget then shipped with a titleMap entry but no entry.tsx export, which was
// silent for the same reason.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
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
) as { dtsPropsFor: Record<string, string>; titleMap: Record<string, string> };

const entrySource = readFileSync(
  join(REPO_ROOT, ".design-sync", "entry.tsx"),
  "utf8",
);

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

// NOTES.md's "adding a new widget" checklist is: export the *View from
// entry.tsx AND add a titleMap entry. Both halves are load-bearing — the
// Storybook compare harness redirects a story's `./<Name>View.js` import to
// `window.Sigil.<Name>View` by matching the basename against the bundle's
// exports, so a missing export silently renders a duplicate source copy
// instead of the shipped bundle. Nothing else pins them to the registry.
describe("design-sync bundle wiring", () => {
  // The dashboard composes the other widgets rather than being composed, but it
  // is still a rendered View with its own design record, so no widget is exempt.
  for (const widget of WIDGETS) {
    const view = viewKey(widget.name);

    it(`${widget.name}: entry.tsx exports ${view} from a real module`, () => {
      // entry.tsx sits outside the tsconfig program (esbuild compiles it during
      // the sync), so tsc never resolves these paths — check them here.
      const re = new RegExp(`export\\s*\\{\\s*${view}\\s*\\}\\s*from\\s*"([^"]+)"`);
      const match = re.exec(entrySource);
      expect(
        match,
        `.design-sync/entry.tsx is missing "export { ${view} } from …" — see .design-sync/NOTES.md`,
      ).toBeTruthy();
      // ".js" specifiers rewrite to the ".tsx" source the same way the bundler
      // resolves them.
      const source = match![1]!.replace(/\.js$/, ".tsx");
      expect(
        existsSync(join(REPO_ROOT, ".design-sync", source)),
        `.design-sync/entry.tsx exports ${view} from "${match![1]}", which does not resolve`,
      ).toBe(true);
    });

    it(`${widget.name}: titleMap resolves to ${view}`, () => {
      expect(
        Object.values(config.titleMap),
        `.design-sync/config.json titleMap has no entry mapping to ${view}`,
      ).toContain(view);
    });
  }

  it("entry.tsx exports no View the registry does not know about", () => {
    const exported = [...entrySource.matchAll(/export\s*\{\s*(\w+View)\s*\}/g)].map(
      (m) => m[1]!,
    );
    const known = WIDGETS.map((w) => viewKey(w.name));
    expect(exported.filter((name) => !known.includes(name))).toEqual([]);
  });
});
