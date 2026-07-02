// End-to-end validation of the MCP Apps pipeline: a real MCP Client talks to
// the actual `createServer()` over an in-memory transport — exercising the full
// initialize → tools/list → tools/call → resources round-trip that a host
// (Claude Desktop, Claude web) drives, without a GUI. Tool calls run the real
// zod-validated handlers; resource reads serve the bundled widget HTML when
// `dist/widgets` is present (after `npm run build:widgets`), and otherwise
// assert the informative "bundle missing" error so the suite is green either
// way.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../mcp-server.js";
import { WIDGETS } from "../registry.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const distBuilt = existsSync(join(REPO_ROOT, "dist", "widgets", "bar-chart", "index.html"));

const toolName = (widget: string) => `render_${widget.replaceAll("-", "_")}`;

// A minimal valid payload per tool. Also serves as the coverage list: the suite
// asserts this exactly matches the registered tool set, so a new widget without
// an E2E call fails the test.
const TOOL_ARGS: Record<string, Record<string, unknown>> = {
  render_bar_chart: { title: "E2E bar", data: [{ label: "A", value: 1 }] },
  render_line_chart: { title: "E2E line", series: [{ name: "S", data: [{ x: "Jan", y: 1 }] }] },
  render_pie_chart: { title: "E2E pie", data: [{ label: "A", value: 1 }] },
  render_table: { title: "E2E table", columns: [{ key: "a", label: "A" }], rows: [{ a: 1 }] },
  render_scatter_chart: { title: "E2E scatter", series: [{ name: "S", data: [{ x: 1, y: 2 }] }] },
  render_treemap: { title: "E2E treemap", data: [{ label: "A", value: 1 }] },
  render_heatmap: {
    title: "E2E heatmap",
    xLabels: ["a"],
    yLabels: ["b"],
    cells: [{ x: 0, y: 0, value: 1 }],
  },
  render_stat_panel: { title: "E2E stat", items: [{ label: "A", value: 1 }] },
  render_dashboard: {
    title: "E2E dash",
    tiles: [{ type: "bar-chart", payload: { title: "t", data: [{ label: "A", value: 1 }] } }],
  },
  render_map: { title: "E2E map", data: [{ id: "USA", value: 1 }] },
};

let client!: Client;

beforeAll(async () => {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "sigil-e2e", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterAll(async () => {
  await client?.close();
});

describe("MCP Apps pipeline (in-process client↔server)", () => {
  it("lists every render_* tool, each linked to its ui:// resource", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    const expected = WIDGETS.map((w) => toolName(w.name)).sort();

    expect(names).toEqual(expected);
    // Coverage guard: every registered tool has an E2E call below.
    expect(Object.keys(TOOL_ARGS).sort()).toEqual(expected);

    for (const w of WIDGETS) {
      const tool = tools.find((t) => t.name === toolName(w.name))!;
      const meta = tool._meta as { ui?: { resourceUri?: string } } | undefined;
      expect(meta?.ui?.resourceUri).toBe(w.uri);
    }
  });

  for (const w of WIDGETS) {
    const name = toolName(w.name);
    it(`${name}: round-trips its payload over the protocol`, async () => {
      const args = TOOL_ARGS[name]!;
      const res = await client.callTool({ name, arguments: args });

      expect(res.isError).toBeFalsy();

      // structuredContent is what the host hands the widget via app.ontoolresult.
      const structured = res.structuredContent as { title?: string } | undefined;
      expect(structured?.title).toBe(args["title"]);

      // The text content mirrors it (fallback path in widget-shell).
      const content = res.content as Array<{ type: string; text?: string }>;
      const text = content.find((c) => c.type === "text")?.text ?? "";
      expect(JSON.parse(text).title).toBe(args["title"]);
    });
  }

  it("exposes one ui:// resource per widget", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri).sort();
    expect(uris).toEqual(WIDGETS.map((w) => w.uri).sort());
  });

  it(
    distBuilt
      ? "serves bundled HTML for every ui:// resource"
      : "reports a helpful error when widget bundles are unbuilt",
    async () => {
      if (!distBuilt) {
        await expect(client.readResource({ uri: WIDGETS[0]!.uri })).rejects.toThrow(
          /bundle missing/i,
        );
        return;
      }
      for (const w of WIDGETS) {
        const res = await client.readResource({ uri: w.uri });
        const text = (res.contents[0] as { text?: string } | undefined)?.text ?? "";
        expect(text).toMatch(/<!doctype html/i);
        expect(text).toContain('id="root"');
      }
    },
  );
});
