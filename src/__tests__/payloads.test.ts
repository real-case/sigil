import { describe, it, expect } from "vitest";
import { isBarChartPayload } from "../widgets/bar-chart/App.js";
import { isLineChartPayload } from "../widgets/line-chart/App.js";
import { isPieChartPayload } from "../widgets/pie-chart/App.js";
import { isTablePayload } from "../widgets/table/App.js";
import { isScatterChartPayload } from "../widgets/scatter-chart/App.js";
import { isTreemapPayload } from "../widgets/treemap/App.js";
import { isHeatmapPayload } from "../widgets/heatmap/App.js";

type Mutator = (v: Record<string, unknown>) => unknown;

interface GuardCase {
  name: string;
  guard: (v: unknown) => boolean;
  valid: Record<string, unknown>;
  rejects: Record<string, Mutator>;
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
      "missing orientation": omit("orientation"),
      "invalid orientation": set("orientation", "diagonal"),
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
      "missing variant": omit("variant"),
      "invalid variant": set("variant", "ring"),
      "datum missing value": set("data", [{ label: "a" }]),
      "maxSegments below 2": set("maxSegments", 1),
      "maxSegments non-integer": set("maxSegments", 4.5),
      "maxSegments non-number": set("maxSegments", "5"),
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
      "missing sortable": omit("sortable"),
      "missing filterable": omit("filterable"),
      "non-boolean sortable": set("sortable", "yes"),
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
    },
  },
];

describe("payload guards", () => {
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
    });
  }
});
