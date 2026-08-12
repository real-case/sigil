// End-to-end validation of the MCP Apps pipeline: a real MCP Client talks to
// the actual `createServer()` over an in-memory transport — exercising the full
// initialize → tools/list → tools/call → resources round-trip that a host
// (Claude Desktop, Claude web) drives, without a GUI. Tool calls run the real
// zod-validated handlers; resource reads serve the bundled widget HTML when
// `dist/widgets` is present (after `npm run build:widgets`), and otherwise
// assert the informative "bundle missing" error so the suite is green either
// way — locally. Under CI that leniency is withdrawn: see the gate below.

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

// Every widget, not a single probe file. Asking only about bar-chart read a
// part-built tree — an older dist predating a newer widget — as fully built,
// so the resource loop below failed on the missing one instead of taking the
// unbuilt branch it was written to take.
const missingBundles = WIDGETS.filter(
  (w) => !existsSync(join(REPO_ROOT, "dist", "widgets", w.name, "index.html")),
).map((w) => w.name);
const distBuilt = missingBundles.length === 0;

const IN_CI = process.env["CI"] === "true" || process.env["CI"] === "1";

const toolName = (widget: string) => `render_${widget.replaceAll("-", "_")}`;

// A minimal valid payload per tool (pie also carries maxSegments to exercise
// the passthrough — see the dedicated test below). Also serves as the coverage
// list: the suite asserts this exactly matches the registered tool set, so a
// new widget without an E2E call fails the test.
const TOOL_ARGS: Record<string, Record<string, unknown>> = {
  render_bar_chart: { title: "E2E bar", data: [{ label: "A", value: 1 }] },
  render_line_chart: { title: "E2E line", series: [{ name: "S", data: [{ x: "Jan", y: 1 }] }] },
  render_pie_chart: { title: "E2E pie", data: [{ label: "A", value: 1 }], maxSegments: 7 },
  render_table: {
    title: "E2E table",
    columns: [
      { key: "a", label: "A" },
      { key: "trend", label: "Trend", kind: "sparkline" },
    ],
    rows: [{ a: 1, trend: [1, 2, 3] }],
  },
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
  render_sankey: {
    title: "E2E sankey",
    links: [{ source: "A", target: "B", value: 1 }],
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

  it("render_pie_chart: forwards maxSegments and rejects an out-of-range value", async () => {
    const args = TOOL_ARGS["render_pie_chart"]!;
    const res = await client.callTool({ name: "render_pie_chart", arguments: args });
    expect(res.isError).toBeFalsy();
    const structured = res.structuredContent as { maxSegments?: number };
    expect(structured.maxSegments).toBe(args["maxSegments"]);

    // Below the zod bound (min 2): the schema must reject it, either as a
    // protocol-level error (rejected promise) or an isError tool result — and
    // the failure must actually blame the field, not some unrelated fault.
    const failure = await client
      .callTool({
        name: "render_pie_chart",
        arguments: { title: "E2E pie bad", data: [{ label: "A", value: 1 }], maxSegments: 1 },
      })
      .then(
        (r) =>
          (r as { isError?: boolean }).isError
            ? JSON.stringify((r as { content?: unknown }).content)
            : "unexpected success",
        (e: unknown) => String(e),
      );
    expect(failure).not.toBe("unexpected success");
    expect(failure).toMatch(/maxSegments/i);
  });

  it("render_table: round-trips sparkline arrays and rejects a non-numeric entry", async () => {
    const args = TOOL_ARGS["render_table"]!;
    const res = await client.callTool({ name: "render_table", arguments: args });
    expect(res.isError).toBeFalsy();

    // The number array must cross the protocol intact — not stringified.
    const structured = res.structuredContent as {
      rows?: Array<Record<string, unknown>>;
    };
    expect(structured.rows?.[0]?.["trend"]).toEqual([1, 2, 3]);

    // An array containing a string violates the rows cell union: the schema
    // must reject it, and the failure must actually blame rows.
    const failure = await client
      .callTool({
        name: "render_table",
        arguments: {
          title: "E2E table bad",
          columns: [{ key: "trend", label: "Trend", kind: "sparkline" }],
          rows: [{ trend: [1, "2"] }],
        },
      })
      .then(
        (r) =>
          (r as { isError?: boolean }).isError
            ? JSON.stringify((r as { content?: unknown }).content)
            : "unexpected success",
        (e: unknown) => String(e),
      );
    expect(failure).not.toBe("unexpected success");
    expect(failure).toMatch(/rows/i);
  });

  it("exposes one ui:// resource per widget", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri).sort();
    expect(uris).toEqual(WIDGETS.map((w) => w.uri).sort());
  });

  // The lenient branch below exists so a developer can run the suite without
  // building first. In CI it is a trap: `npm test` ran before `npm run build`,
  // so the checkout never had a dist, the resource assertion silently became
  // the "bundle missing" assertion, and the strongest check in this file spent
  // its life not running. Ordering alone would not hold — the next edit to the
  // workflow can undo it just as quietly — so the suite states the requirement
  // itself and CI fails loudly if the bundles are not there.
  it.runIf(IN_CI)("runs against built widget bundles under CI", () => {
    expect(
      missingBundles,
      "unbuilt widget bundles under CI — is 'npm run build' still ahead of 'npm test' in ci.yml?",
    ).toEqual([]);
  });

  it(
    distBuilt
      ? "serves bundled HTML for every ui:// resource"
      : "reports a helpful error when widget bundles are unbuilt",
    async () => {
      if (!distBuilt) {
        // Probe a widget that is actually absent. Reaching for WIDGETS[0]
        // assumed "unbuilt" meant "nothing built", so a part-built tree failed
        // here instead — the same wrong answer the old single-file probe gave,
        // one branch over.
        const absent = WIDGETS.find((w) => missingBundles.includes(w.name))!;
        await expect(client.readResource({ uri: absent.uri })).rejects.toThrow(
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
