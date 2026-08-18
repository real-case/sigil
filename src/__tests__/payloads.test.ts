import { describe, it, expect } from "vitest";
import { WIDGETS } from "../registry.js";
import { isBarChartPayload } from "../widgets/bar-chart/guard.js";
import { isLineChartPayload } from "../widgets/line-chart/guard.js";
import { isPieChartPayload } from "../widgets/pie-chart/guard.js";
import { isTablePayload } from "../widgets/table/guard.js";
import { isScatterChartPayload } from "../widgets/scatter-chart/guard.js";
import { isTreemapPayload } from "../widgets/treemap/guard.js";
import { isHeatmapPayload } from "../widgets/heatmap/guard.js";
import { isSankeyPayload } from "../widgets/sankey/guard.js";
import { isMapPayload } from "../widgets/map/guard.js";
import { isStatPanelPayload } from "../widgets/stat-panel/guard.js";
import { isDashboardPayload } from "../widgets/dashboard/guard.js";

type Mutator = (v: Record<string, unknown>) => unknown;

interface GuardCase {
  name: string;
  guard: (v: unknown) => boolean;
  valid: Record<string, unknown>;
  rejects: Record<string, Mutator>;
  /**
   * Further payloads the guard must ACCEPT, beyond `valid`. Needed where the
   * interesting property is breadth rather than strictness — the dashboard
   * guard deliberately knows no tile-type list, and only a spread of accepted
   * types shows that the list was deleted rather than merely corrected.
   */
  accepts?: Record<string, Mutator>;
}

const omit = (key: string): Mutator => (v) => {
  const copy = { ...v };
  delete copy[key];
  return copy;
};

const set = (key: string, value: unknown): Mutator => (v) => ({
  ...v,
  [key]: value,
});

/** Replace a dashboard's tiles with a single tile of the given type. */
const tile = (type: string, payload: Record<string, unknown> = { title: "T" }): Mutator =>
  set("tiles", [{ type, payload }]);

const cases: GuardCase[] = [
  {
    name: "bar-chart",
    guard: isBarChartPayload,
    valid: {
      title: "T",
      data: [{ label: "a", value: 1 }],
      orientation: "vertical",
    },
    rejects: {
      "missing title": omit("title"),
      "non-string title": set("title", 42),
      "missing data": omit("data"),
      "non-array data": set("data", "x"),
      "datum missing label": set("data", [{ value: 1 }]),
      "datum non-string label": set("data", [{ label: 1, value: 1 }]),
      "datum non-number value": set("data", [{ label: "a", value: "x" }]),
      "invalid orientation": set("orientation", "diagonal"),
      "empty title": set("title", ""),
      "empty data": set("data", []),
      "datum with empty label": set("data", [{ label: "", value: 1 }]),
      "datum with NaN value": set("data", [{ label: "a", value: NaN }]),
      "datum with Infinity value": set("data", [{ label: "a", value: Infinity }]),
    },
    accepts: {
      // The schema marks orientation optional and the handler defaults it, so a
      // tile carrying exactly what render_bar_chart accepts must pass here.
      "missing orientation": omit("orientation"),
    },
  },
  {
    name: "line-chart",
    guard: isLineChartPayload,
    valid: {
      title: "T",
      series: [{ name: "s", data: [{ x: 1, y: 2 }] }],
    },
    rejects: {
      "missing title": omit("title"),
      "missing series": omit("series"),
      "series not array": set("series", {}),
      "empty series": set("series", []),
      "series with empty data": set("series", [{ name: "s", data: [] }]),
      "series missing name": set("series", [{ data: [{ x: 1, y: 2 }] }]),
      "datum non-numeric y": set("series", [
        { name: "s", data: [{ x: 1, y: "z" }] },
      ]),
      "datum missing x": set("series", [
        { name: "s", data: [{ y: 2 }] },
      ]),
    },
  },
  {
    name: "pie-chart",
    guard: isPieChartPayload,
    valid: {
      title: "T",
      data: [{ label: "a", value: 1 }],
      variant: "donut",
      maxSegments: 7,
    },
    rejects: {
      "missing title": omit("title"),
      "missing data": omit("data"),
      "invalid variant": set("variant", "ring"),
      "datum missing value": set("data", [{ label: "a" }]),
      "maxSegments below 2": set("maxSegments", 1),
      "maxSegments non-integer": set("maxSegments", 4.5),
      "maxSegments non-number": set("maxSegments", "5"),
      "empty data": set("data", []),
      "datum with negative value": set("data", [{ label: "a", value: -1 }]),
    },
    accepts: {
      // Optional in the schema, defaulted to "donut" by the handler and now by
      // PieChartView — which previously would have drawn a solid pie.
      "missing variant": omit("variant"),
    },
  },
  {
    // Guards the undefined branch: a guard written without it would reject
    // every existing pie payload while the table above stays green.
    name: "pie-chart (no maxSegments)",
    guard: isPieChartPayload,
    valid: {
      title: "T",
      data: [{ label: "a", value: 1 }],
      variant: "donut",
    },
    rejects: {},
  },
  {
    name: "table",
    guard: isTablePayload,
    valid: {
      title: "T",
      columns: [{ key: "id", label: "ID" }],
      rows: [{ id: 1 }],
      sortable: true,
      filterable: false,
    },
    rejects: {
      "missing title": omit("title"),
      "missing columns": omit("columns"),
      "column missing key": set("columns", [{ label: "ID" }]),
      "column missing label": set("columns", [{ key: "id" }]),
      "invalid column align": set("columns", [
        { key: "id", label: "ID", align: "diagonal" },
      ]),
      "row with object value": set("rows", [{ id: { nested: 1 } }]),
      "non-boolean sortable": set("sortable", "yes"),
      "empty columns": set("columns", []),
      "column with empty key": set("columns", [{ key: "", label: "ID" }]),
    },
    accepts: {
      // Both optional in the schema, both defaulted to true by the handler and
      // by TableView. Requiring them made a tile that omitted them invalid —
      // and reading them raw would have turned the features off instead.
      "missing sortable": omit("sortable"),
      "missing filterable": omit("filterable"),
      "empty rows": set("rows", []),
    },
  },
  {
    // Sparkline coverage lands as a second case so the kind-less case above
    // keeps its column-mutating rejects failing through the columns branch
    // (see spec 002 blocker B4: a shared valid payload would let the rows
    // branch shadow column rejects).
    name: "table (sparkline)",
    guard: isTablePayload,
    valid: {
      title: "T",
      columns: [
        { key: "name", label: "Name" },
        { key: "trend", label: "Trend", kind: "sparkline" },
      ],
      rows: [
        { name: "api", trend: [1, 2, 3] },
        { name: "web", trend: 7 },
      ],
      sortable: true,
      filterable: true,
    },
    rejects: {
      "array under a text column": set("rows", [{ name: [1, 2], trend: [1, 2] }]),
      "array with a non-number": set("rows", [{ name: "a", trend: [1, "2"] }]),
      "array with Infinity": set("rows", [{ name: "a", trend: [1, Infinity] }]),
      "invalid kind literal": set("columns", [
        { key: "trend", label: "Trend", kind: "line" },
      ]),
    },
  },
  {
    name: "scatter-chart",
    guard: isScatterChartPayload,
    valid: {
      title: "T",
      series: [{ name: "s", data: [{ x: 1, y: 2 }] }],
    },
    rejects: {
      "missing title": omit("title"),
      "missing series": omit("series"),
      "series missing name": set("series", [{ data: [{ x: 1, y: 2 }] }]),
      "datum non-numeric x": set("series", [
        { name: "s", data: [{ x: "a", y: 2 }] },
      ]),
      "datum size <= 0": set("series", [
        { name: "s", data: [{ x: 1, y: 2, size: 0 }] },
      ]),
      "datum non-numeric size": set("series", [
        { name: "s", data: [{ x: 1, y: 2, size: "big" }] },
      ]),
      "empty series": set("series", []),
      "series with empty data": set("series", [{ name: "s", data: [] }]),
    },
  },
  {
    name: "treemap",
    guard: isTreemapPayload,
    valid: {
      title: "T",
      data: [{ label: "root", value: 10 }],
    },
    rejects: {
      "missing title": omit("title"),
      "missing data": omit("data"),
      "node missing label": set("data", [{ value: 1 }]),
      "node negative value": set("data", [{ label: "x", value: -1 }]),
      "non-array children": set("data", [
        { label: "x", value: 1, children: "y" },
      ]),
      "invalid nested child": set("data", [
        { label: "x", value: 1, children: [{ label: 1 }] },
      ]),
      "empty data": set("data", []),
    },
  },
  {
    name: "heatmap",
    guard: isHeatmapPayload,
    valid: {
      title: "T",
      xLabels: ["a", "b"],
      yLabels: ["1", "2"],
      cells: [{ x: 0, y: 0, value: 5 }],
    },
    rejects: {
      "missing title": omit("title"),
      "non-string xLabel": set("xLabels", [1, 2]),
      "missing yLabels": omit("yLabels"),
      "missing cells": omit("cells"),
      "cell with float x index": set("cells", [{ x: 0.5, y: 0, value: 5 }]),
      "cell with negative y index": set("cells", [{ x: 0, y: -1, value: 5 }]),
      "cell with non-numeric value": set("cells", [{ x: 0, y: 0, value: "high" }]),
      "empty xLabels": set("xLabels", []),
      "empty yLabels": set("yLabels", []),
      "empty cells": set("cells", []),
      "empty-string xLabel": set("xLabels", ["a", ""]),
    },
  },
  {
    name: "sankey",
    guard: isSankeyPayload,
    valid: {
      title: "T",
      nodes: [{ name: "a" }, { name: "b" }],
      links: [{ source: "a", target: "b", value: 5 }],
    },
    rejects: {
      "missing title": omit("title"),
      "missing links": omit("links"),
      "non-array links": set("links", "x"),
      "link missing source": set("links", [{ target: "b", value: 1 }]),
      "link non-string target": set("links", [{ source: "a", target: 2, value: 1 }]),
      "link negative value": set("links", [{ source: "a", target: "b", value: -1 }]),
      "non-array nodes": set("nodes", "x"),
      "node missing name": set("nodes", [{ color: "red" }]),
      "node non-string color": set("nodes", [{ name: "a", color: 7 }]),
      "non-string valueLabel": set("valueLabel", 3),
      "empty links": set("links", []),
      "link with empty source": set("links", [{ source: "", target: "b", value: 1 }]),
    },
    accepts: {
      // nodes is optional in the schema — derived from the links when absent.
      "missing nodes": omit("nodes"),
    },
  },
  {
    name: "map",
    guard: isMapPayload,
    valid: {
      title: "T",
      scope: "world",
      variant: "choropleth",
      data: [{ id: "USA", value: 1 }],
    },
    rejects: {
      "missing title": omit("title"),
      // Both enums went unchecked, so scopeGeo's ternary answered "moon" with
      // the world map and a us-states request could be served silently wrong.
      "invalid scope": set("scope", "moon"),
      "invalid variant": set("variant", "hologram"),
      "non-array data": set("data", "everywhere"),
      "region missing id": set("data", [{ value: 1 }]),
      "region with empty id": set("data", [{ id: "", value: 1 }]),
      "region non-numeric value": set("data", [{ id: "USA", value: "x" }]),
      // Points must stand alone here: a valid `data` would satisfy the guard
      // regardless of what `points` contains.
      "point missing lat when points is the only source": (v) => {
        const copy = { ...v };
        delete copy["data"];
        copy["points"] = [{ lon: 0, value: 1 }];
        return copy;
      },
    },
    accepts: {
      // `render_map({ title })` is a legal call — both arrays are optional in
      // the schema — and renders the empty state. Requiring one of them made
      // that exact payload invalid as a tile.
      "neither data nor points": (v) => {
        const copy = { ...v };
        delete copy["data"];
        delete copy["points"];
        return copy;
      },
      "missing scope and variant": (v) => {
        const copy = { ...v };
        delete copy["scope"];
        delete copy["variant"];
        return copy;
      },
    },
  },
  {
    name: "stat-panel",
    guard: isStatPanelPayload,
    valid: {
      title: "T",
      items: [{ label: "A", value: 1 }],
    },
    rejects: {
      "missing title": omit("title"),
      "missing items": omit("items"),
      "empty items": set("items", []),
      "item missing label": set("items", [{ value: 1 }]),
      "item with non-scalar value": set("items", [{ label: "A", value: {} }]),
      "item with non-numeric delta": set("items", [{ label: "A", value: 1, delta: "up" }]),
      // Everything below reached StatPanelView unchecked before: the guard
      // stopped after label/value/unit/delta/status, and status was accepted as
      // any string rather than the schema's four-value enum.
      "item with a non-array trend": set("items", [{ label: "A", value: 1, trend: "oops" }]),
      "item with a non-numeric trend entry": set("items", [
        { label: "A", value: 1, trend: [1, "2"] },
      ]),
      "item with an unknown status": set("items", [
        { label: "A", value: 1, status: "banana" },
      ]),
      "item with a non-numeric target": set("items", [
        { label: "A", value: 1, target: "soon" },
      ]),
      "item with a non-boolean higherIsBetter": set("items", [
        { label: "A", value: 1, higherIsBetter: "yes" },
      ]),
      "item with a non-string badge": set("items", [{ label: "A", value: 1, badge: 7 }]),
      "columns above the schema max": set("columns", 5),
      "columns non-integer": set("columns", 2.5),
    },
    accepts: {
      "every optional field set": set("items", [
        {
          label: "A",
          value: 1,
          unit: "ms",
          delta: -2,
          deltaUnit: "%",
          deltaCaption: "vs last week",
          higherIsBetter: false,
          description: "p95 latency",
          status: "warning",
          trend: [1, 2, 3],
          target: 100,
          badge: "SLO",
        },
      ]),
    },
  },
  {
    name: "dashboard",
    guard: isDashboardPayload,
    valid: {
      title: "T",
      tiles: [
        { type: "bar-chart", payload: { title: "T", data: [], orientation: "vertical" } },
      ],
    },
    rejects: {
      "missing title": omit("title"),
      "missing tiles": omit("tiles"),
      "empty tiles": set("tiles", []),
      "an empty type string": tile(""),
      "tile missing payload": set("tiles", [{ type: "bar-chart" }]),
      "tile with null payload": set("tiles", [{ type: "bar-chart", payload: null }]),
      "tile with non-object payload": set("tiles", [{ type: "bar-chart", payload: "x" }]),
      "tile with non-numeric colSpan": set("tiles", [
        { type: "bar-chart", payload: {}, colSpan: "2" },
      ]),
      "tile with colSpan above the schema max": set("tiles", [
        { type: "bar-chart", payload: {}, colSpan: 9 },
      ]),
      "tile with an array payload": set("tiles", [{ type: "bar-chart", payload: [] }]),
      "columns above the schema max": set("columns", 5),
    },
    // Every type `render_dashboard` accepts must pass. `sankey` and `map` are
    // the regression: a hardcoded eight-entry set here once rejected both, and
    // because the guard runs at mount the whole dashboard failed to load. The
    // last two go further — no widget renders them — and only a guard with no
    // tile-type list at all can accept those.
    accepts: {
      "bar-chart tile": tile("bar-chart", { title: "T", data: [], orientation: "vertical" }),
      "line-chart tile": tile("line-chart", { title: "T", series: [] }),
      "pie-chart tile": tile("pie-chart", { title: "T", data: [], variant: "pie" }),
      "table tile": tile("table", {
        title: "T",
        columns: [],
        rows: [],
        sortable: false,
        filterable: false,
      }),
      "scatter-chart tile": tile("scatter-chart", { title: "T", series: [] }),
      "treemap tile": tile("treemap", { title: "T", data: [] }),
      "heatmap tile": tile("heatmap", {
        title: "T",
        xLabels: [],
        yLabels: [],
        cells: [],
      }),
      "stat-panel tile": tile("stat-panel", { title: "T", items: [{ label: "A", value: 1 }] }),
      "sankey tile": tile("sankey", { title: "T", links: [] }),
      "map tile": tile("map", {
        title: "T",
        scope: "world",
        variant: "choropleth",
        data: [],
      }),
      "an unrecognised tile type": tile("totally-made-up"),
      "a prototype-key tile type": tile("toString"),
    },
  },
];

describe("payload guards", () => {
  it("covers every registered widget", () => {
    // The case list is hand-written and nothing else looks at it, so a twelfth
    // widget's guard would go entirely untested here with the file still green.
    // Suffixed cases ("table (sparkline)") are extra angles on a widget already
    // covered, hence the trim rather than an exact-name match.
    const covered = new Set(cases.map((c) => c.name.replace(/\s*\(.*\)$/, "")));
    expect([...covered].sort()).toEqual(WIDGETS.map((w) => w.name).sort());
  });

  for (const c of cases) {
    describe(c.name, () => {
      it("accepts a valid payload", () => {
        expect(c.guard(c.valid)).toBe(true);
      });

      it("rejects null and primitives", () => {
        expect(c.guard(null)).toBe(false);
        expect(c.guard(undefined)).toBe(false);
        expect(c.guard("string")).toBe(false);
        expect(c.guard(42)).toBe(false);
      });

      for (const [label, mutate] of Object.entries(c.rejects)) {
        it(`rejects: ${label}`, () => {
          const bad = mutate({ ...c.valid });
          expect(c.guard(bad)).toBe(false);
        });
      }

      for (const [label, mutate] of Object.entries(c.accepts ?? {})) {
        it(`accepts ${label}`, () => {
          const good = mutate({ ...c.valid });
          expect(c.guard(good)).toBe(true);
        });
      }
    });
  }
});
