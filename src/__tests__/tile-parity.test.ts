// `render_dashboard` promises that a tile's `payload` is "exactly what that
// widget's own render_* tool takes". Nothing enforced it: the tool types a tile
// payload as an opaque record, so zod never sees it, and the payload guard —
// the only thing that does — had been written against the handler's OUTPUT.
// Three guards therefore demanded fields the schema marks optional, and a bar
// tile of `{ title, data }` (a valid render_bar_chart call, and the obvious
// thing for a model to write) rendered as "Invalid bar-chart tile".
//
// This file makes the promise testable in the direction that broke: whatever
// the real tool accepts, the guard must accept — both the arguments as sent,
// which is what a tile actually carries, and the payload the handler returns,
// which is what a top-level widget receives. The two coincide only when the
// guard treats the schema's optionals as optional.
//
// The other direction — everything the schema rejects, the guard must reject —
// is covered case by case in payloads.test.ts, which can express the places the
// guard is deliberately stricter (table's column-aware cells) or deliberately
// looser (a dashboard tile's `type`).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../mcp-server.js";
import { WIDGETS } from "../registry.js";
import { isBarChartPayload } from "../widgets/bar-chart/guard.js";
import { isLineChartPayload } from "../widgets/line-chart/guard.js";
import { isPieChartPayload } from "../widgets/pie-chart/guard.js";
import { isTablePayload } from "../widgets/table/guard.js";
import { isScatterChartPayload } from "../widgets/scatter-chart/guard.js";
import { isTreemapPayload } from "../widgets/treemap/guard.js";
import { isHeatmapPayload } from "../widgets/heatmap/guard.js";
import { isStatPanelPayload } from "../widgets/stat-panel/guard.js";
import { isSankeyPayload } from "../widgets/sankey/guard.js";
import { isMapPayload } from "../widgets/map/guard.js";
import { isDashboardPayload } from "../widgets/dashboard/guard.js";
import type {
  BarChartPayload,
  LineChartPayload,
  PieChartPayload,
  TablePayload,
  ScatterChartPayload,
  TreemapPayload,
  HeatmapPayload,
  StatPanelPayload,
  SankeyPayload,
  MapPayload,
  DashboardPayload,
} from "../shared/payloads.js";

interface ParityCase<P> {
  guard: (value: unknown) => boolean;
  /** Only the fields the schema requires — what a terse tool call looks like. */
  minimal: P;
  /** Every optional the schema declares, so none of them is merely untested. */
  maximal: P;
}

/**
 * Types each corpus entry as the payload its guard narrows to, then erases that
 * type so the cases can share one table.
 *
 * The erasure is deliberate and the typing is the point: a guard declared
 * `value is MapPayload` is an assertion `tsc` takes on faith, so relaxing a
 * guard to treat a field as optional while the payload type still declares it
 * required produces a narrowing that lies, and no runtime assertion anywhere
 * can see it. Writing the corpus at the payload type turns that into a
 * compile error — which is how the map entry below was caught.
 */
type ErasedCase = ParityCase<Record<string, unknown>>;

const parity = <P,>(c: ParityCase<P>): ErasedCase => c as unknown as ErasedCase;

const CASES: Record<string, ErasedCase> = {
  "bar-chart": parity<BarChartPayload>({
    guard: isBarChartPayload,
    minimal: { title: "T", data: [{ label: "a", value: 1 }] },
    maximal: {
      title: "T",
      data: [{ label: "a", value: 1, color: "#6366F1" }],
      orientation: "horizontal",
      xlabel: "x",
      ylabel: "y",
    },
  }),
  "line-chart": parity<LineChartPayload>({
    guard: isLineChartPayload,
    minimal: { title: "T", series: [{ name: "s", data: [{ x: "Jan", y: 1 }] }] },
    maximal: {
      title: "T",
      series: [{ name: "s", data: [{ x: 1, y: 2 }] }],
      xlabel: "x",
      ylabel: "y",
    },
  }),
  "pie-chart": parity<PieChartPayload>({
    guard: isPieChartPayload,
    minimal: { title: "T", data: [{ label: "a", value: 1 }] },
    maximal: {
      title: "T",
      data: [{ label: "a", value: 1, color: "#6366F1" }],
      variant: "pie",
      maxSegments: 7,
    },
  }),
  table: parity<TablePayload>({
    guard: isTablePayload,
    minimal: { title: "T", columns: [{ key: "a", label: "A" }], rows: [] },
    maximal: {
      title: "T",
      columns: [
        { key: "a", label: "A", align: "right" },
        { key: "trend", label: "Trend", kind: "sparkline" },
      ],
      rows: [{ a: 1, trend: [1, 2, 3] }],
      sortable: false,
      filterable: false,
    },
  }),
  "scatter-chart": parity<ScatterChartPayload>({
    guard: isScatterChartPayload,
    minimal: { title: "T", series: [{ name: "s", data: [{ x: 1, y: 2 }] }] },
    maximal: {
      title: "T",
      series: [{ name: "s", data: [{ x: 1, y: 2, size: 3 }] }],
      xlabel: "x",
      ylabel: "y",
    },
  }),
  treemap: parity<TreemapPayload>({
    guard: isTreemapPayload,
    minimal: { title: "T", data: [{ label: "a", value: 1 }] },
    maximal: {
      title: "T",
      data: [
        {
          label: "a",
          value: 1,
          color: "#6366F1",
          children: [{ label: "b", value: 1 }],
        },
      ],
    },
  }),
  heatmap: parity<HeatmapPayload>({
    guard: isHeatmapPayload,
    minimal: {
      title: "T",
      xLabels: ["a"],
      yLabels: ["b"],
      cells: [{ x: 0, y: 0, value: 1 }],
    },
    maximal: {
      title: "T",
      xLabels: ["a"],
      yLabels: ["b"],
      cells: [{ x: 0, y: 0, value: 1 }],
      xlabel: "x",
      ylabel: "y",
    },
  }),
  "stat-panel": parity<StatPanelPayload>({
    guard: isStatPanelPayload,
    minimal: { title: "T", items: [{ label: "A", value: 1 }] },
    maximal: {
      title: "T",
      items: [
        {
          label: "A",
          value: 1,
          unit: "ms",
          delta: -2,
          deltaUnit: "%",
          deltaCaption: "vs last week",
          higherIsBetter: false,
          description: "p95",
          status: "warning",
          trend: [1, 2, 3],
          target: 100,
          badge: "SLO",
        },
      ],
      columns: 3,
    },
  }),
  sankey: parity<SankeyPayload>({
    guard: isSankeyPayload,
    minimal: { title: "T", links: [{ source: "a", target: "b", value: 1 }] },
    maximal: {
      title: "T",
      nodes: [{ name: "a", color: "#6366F1" }, { name: "b" }],
      links: [{ source: "a", target: "b", value: 1 }],
      valueLabel: "users",
    },
  }),
  map: parity<MapPayload>({
    // The schema requires nothing but a title — both `data` and `points` are
    // optional, and the widget has an empty state for exactly this.
    guard: isMapPayload,
    minimal: { title: "T" },
    maximal: {
      title: "T",
      scope: "us-states",
      variant: "bubble",
      data: [{ id: "CA", value: 1, label: "California" }],
      points: [{ lat: 37, lon: -122, value: 1, label: "SF" }],
      valueLabel: "GDP",
    },
  }),
  dashboard: parity<DashboardPayload>({
    guard: isDashboardPayload,
    minimal: {
      title: "T",
      tiles: [{ type: "bar-chart", payload: { title: "t", data: [{ label: "a", value: 1 }] } }],
    },
    maximal: {
      title: "T",
      columns: 3,
      tiles: [
        {
          type: "stat-panel",
          payload: { title: "t", items: [{ label: "A", value: 1 }] },
          colSpan: 2,
        },
      ],
    },
  }),
};

const toolName = (widget: string) => `render_${widget.replaceAll("-", "_")}`;

let client!: Client;

beforeAll(async () => {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "sigil-tile-parity", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterAll(async () => {
  await client?.close();
});

describe("a tile payload is what the tool accepts", () => {
  it("covers every registered widget", () => {
    expect(Object.keys(CASES).sort()).toEqual(WIDGETS.map((w) => w.name).sort());
  });

  for (const [widget, c] of Object.entries(CASES)) {
    for (const shape of ["minimal", "maximal"] as const) {
      it(`${widget}: ${shape} — tool accepts it, so the guard must too`, async () => {
        const args = c[shape];

        // Establish that the arguments really are valid, or everything below is
        // vacuous: a typo here would otherwise read as a passing parity check.
        const res = await client.callTool({ name: toolName(widget), arguments: args });
        expect(res.isError, `render_${widget} rejected its own ${shape} arguments`).toBeFalsy();

        // What a dashboard tile carries: the arguments, untouched by any
        // handler. This is the assertion the three broken guards failed.
        expect(c.guard(args), `guard rejected the ${shape} tool arguments`).toBe(true);

        // What a top-level widget receives: the handler's output, defaults and
        // all. Both must pass the same guard.
        expect(
          c.guard(res.structuredContent),
          `guard rejected the ${shape} handler output`,
        ).toBe(true);
      });
    }
  }
});
