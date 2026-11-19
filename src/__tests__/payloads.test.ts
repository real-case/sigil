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
import { isFunnelPayload } from "../widgets/funnel/guard.js";
import { isInfoCardPayload } from "../widgets/info-card/guard.js";
import { isMapPayload } from "../widgets/map/guard.js";
import { isStatPanelPayload } from "../widgets/stat-panel/guard.js";
import { isDashboardPayload } from "../widgets/dashboard/guard.js";
import { isDistributionPayload } from "../widgets/distribution/guard.js";
import { isTimelinePayload } from "../widgets/timeline/guard.js";

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
    name: "bar-chart (series)",
    guard: isBarChartPayload,
    valid: {
      title: "T",
      stack: "normal",
      series: [
        { name: "New", data: [{ label: "Jan", value: 5 }] },
        { name: "Churn", data: [{ label: "Jan", value: -2 }] },
      ],
    },
    rejects: {
      // The schema's cross-field rules: none of these is visible to `.shape`,
      // so the guard (and the tool handler) are where they hold.
      "both data and series": set("data", [{ label: "a", value: 1 }]),
      "neither data nor series": omit("series"),
      "empty series": set("series", []),
      "series with empty data": set("series", [{ name: "s", data: [] }]),
      "series datum missing label": set("series", [{ name: "s", data: [{ value: 1 }] }]),
      "invalid stack": set("stack", "stacked"),
      "invalid mark": set("series", [{ name: "s", mark: "area", data: [{ label: "a", value: 1 }] }]),
      "right axis without ylabelRight": set("series", [
        { name: "s", data: [{ label: "a", value: 1 }] },
        { name: "m", mark: "line", axis: "right", data: [{ label: "a", value: 1 }] },
      ]),
      "line mark on a horizontal chart": (v) => ({
        ...v,
        orientation: "horizontal",
        series: [{ name: "m", mark: "line", data: [{ label: "a", value: 1 }] }],
      }),
      "line on the left axis of a percent stack": (v) => ({
        ...v,
        stack: "percent",
        series: [
          { name: "s", data: [{ label: "a", value: 1 }] },
          { name: "m", mark: "line", data: [{ label: "a", value: 1 }] },
        ],
      }),
      "reference band without to": set("reference", [{ axis: "y", kind: "band", from: 1 }]),
      "reference line without value": set("reference", [{ axis: "y", kind: "line" }]),
      "reference with an unknown tone": set("reference", [
        { axis: "y", kind: "line", value: 1, tone: "info" },
      ]),
    },
    accepts: {
      "grouped (no stack)": omit("stack"),
      "percent stack": set("stack", "percent"),
      "line on a right axis with its label": (v) => ({
        ...v,
        ylabelRight: "Margin %",
        series: [
          { name: "Revenue", data: [{ label: "Q1", value: 10 }] },
          { name: "Margin", mark: "line", axis: "right", data: [{ label: "Q1", value: 40 }] },
        ],
      }),
      "line on the shared axis": set("series", [
        { name: "Revenue", data: [{ label: "Q1", value: 10 }] },
        { name: "Target", mark: "line", data: [{ label: "Q1", value: 12 }] },
      ]),
      "series colour override": set("series", [
        { name: "s", color: "#123456", data: [{ label: "a", value: 1 }] },
      ]),
      "reference line and band": set("reference", [
        { axis: "y", kind: "line", value: 4, label: "Target", tone: "success" },
        { axis: "x", kind: "band", from: "Jan", to: "Feb" },
      ]),
    },
  },
  {
    name: "line-chart (context)",
    guard: isLineChartPayload,
    valid: {
      title: "T",
      series: [
        {
          name: "Revenue",
          data: [{ x: "Jan", y: 2 }],
          compare: { label: "Last year", data: [{ x: "Jan", y: 1 }] },
        },
      ],
      reference: [{ axis: "y", kind: "line", value: 3, label: "Goal" }],
      annotations: [{ x: "Jan", label: "Launch" }],
      partialFrom: "Jan",
    },
    rejects: {
      "compare with empty data": set("series", [
        { name: "s", data: [{ x: 1, y: 1 }], compare: { data: [] } },
      ]),
      "compare datum non-numeric y": set("series", [
        { name: "s", data: [{ x: 1, y: 1 }], compare: { data: [{ x: 1, y: "1" }] } },
      ]),
      "annotation without label": set("annotations", [{ x: "Jan" }]),
      "annotation with empty label": set("annotations", [{ x: "Jan", label: "" }]),
      "reference band without from": set("reference", [{ axis: "x", kind: "band", to: "Feb" }]),
      "partialFrom that is not an x value": set("partialFrom", true),
    },
    accepts: {
      "compare without label": set("series", [
        { name: "s", data: [{ x: 1, y: 1 }], compare: { data: [{ x: 1, y: 0 }] } },
      ]),
      "annotation region": set("annotations", [{ x: "Jan", x2: "Mar", label: "Campaign" }]),
      "numeric partialFrom": set("partialFrom", 12),
    },
  },
  {
    name: "scatter-chart (reference)",
    guard: isScatterChartPayload,
    valid: {
      title: "T",
      series: [{ name: "s", data: [{ x: 1, y: 2 }] }],
      reference: [{ axis: "y", kind: "line", value: 250, label: "SLA", tone: "danger" }],
    },
    rejects: {
      // Both scatter axes are numeric, so a category-style value is an error.
      "string reference value": set("reference", [{ axis: "y", kind: "line", value: "high" }]),
      "band missing to": set("reference", [{ axis: "x", kind: "band", from: 1 }]),
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
      "unknown mode": set("mode", "pivot"),
      "cohortSizes shorter than yLabels": set("cohortSizes", [10]),
      "negative cohort size": set("cohortSizes", [10, -1]),
      "calendar mode without days": set("mode", "calendar"),
    },
    accepts: {
      "cohort mode with sizes": (p) => ({ ...p, mode: "cohort", cohortSizes: [100, 80] }),
      "cohort mode without sizes": set("mode", "cohort"),
      "retention above 100%": set("cells", [{ x: 0, y: 0, value: 118 }]),
    },
  },
  {
    name: "heatmap (calendar)",
    guard: isHeatmapPayload,
    valid: {
      title: "T",
      mode: "calendar",
      days: [
        { date: "2026-01-01", value: 3 },
        { date: "2026-01-02", value: 0 },
      ],
      weekStart: "sunday",
      valueLabel: "commits",
    },
    rejects: {
      "missing days": omit("days"),
      "empty days": set("days", []),
      "non-ISO date": set("days", [{ date: "01/02/2026", value: 1 }]),
      "impossible date": set("days", [{ date: "2026-13-40", value: 1 }]),
      "duplicate date": set("days", [
        { date: "2026-01-01", value: 1 },
        { date: "2026-01-01", value: 2 },
      ]),
      "non-numeric value": set("days", [{ date: "2026-01-01", value: "3" }]),
      "unknown weekStart": set("weekStart", "friday"),
      "days outside calendar mode": (p) => ({ ...p, mode: "matrix", xLabels: ["a"], yLabels: ["b"], cells: [{ x: 0, y: 0, value: 1 }] }),
    },
    accepts: {
      "calendar with matrix fields left out": omit("valueLabel"),
      "diverging calendar": (p) => ({ ...p, scale: "diverging", midpoint: 1 }),
    },
  },
  {
    name: "distribution",
    guard: isDistributionPayload,
    valid: {
      title: "T",
      groups: [{ name: "a", values: [1, 2, 3] }],
      valueLabel: "ms",
      markers: [{ value: 2, label: "SLO", tone: "danger" }],
      followUps: ["Why so slow?"],
    },
    rejects: {
      "missing title": omit("title"),
      "missing groups": omit("groups"),
      "empty groups": set("groups", []),
      "group without data": set("groups", [{ name: "a" }]),
      "empty values": set("groups", [{ name: "a", values: [] }]),
      "non-numeric value": set("groups", [{ name: "a", values: ["1"] }]),
      "histogram from a summary only": set("groups", [
        { name: "a", summary: { min: 1, q1: 2, median: 3, q3: 4, max: 5 } },
      ]),
      "box from bins only": (p) => ({ ...p, variant: "box", groups: [{ name: "a", bins: [{ start: 0, end: 1, count: 2 }] }] }),
      "unordered summary": (p) => ({
        ...p,
        variant: "box",
        groups: [{ name: "a", summary: { min: 1, q1: 4, median: 3, q3: 4, max: 5 } }],
      }),
      "bin with end before start": set("groups", [{ name: "a", bins: [{ start: 2, end: 1, count: 1 }] }]),
      "overlapping bins": set("groups", [
        {
          name: "a",
          bins: [
            { start: 0, end: 2, count: 1 },
            { start: 1, end: 3, count: 1 },
          ],
        },
      ]),
      "negative bin count": set("groups", [{ name: "a", bins: [{ start: 0, end: 1, count: -1 }] }]),
      "binCount below 2": set("binCount", 1),
      "unknown variant": set("variant", "violin"),
      "marker without label": set("markers", [{ value: 1 }]),
    },
    accepts: {
      "box from a summary": (p) => ({
        ...p,
        variant: "box",
        groups: [{ name: "a", summary: { min: 1, q1: 2, median: 3, q3: 4, max: 5, outliers: [9] } }],
      }),
      "histogram from bins": set("groups", [
        {
          name: "a",
          bins: [
            { start: 0, end: 1, count: 3 },
            { start: 1, end: 2, count: 0 },
          ],
        },
      ]),
    },
  },
  {
    name: "timeline",
    guard: isTimelinePayload,
    valid: {
      title: "T",
      items: [
        { row: "api", start: "2026-11-01T00:00:00Z", state: "up" },
        { row: "api", start: "2026-11-01T03:00:00Z", end: "2026-11-01T03:20:00Z", state: "down" },
      ],
      states: [
        { name: "up", tone: "success" },
        { name: "down", tone: "danger" },
      ],
      milestones: [{ at: "2026-11-01T02:00:00Z", label: "Deploy" }],
      now: "2026-11-01T06:00:00Z",
    },
    rejects: {
      "missing title": omit("title"),
      "missing items": omit("items"),
      "empty items": set("items", []),
      "item missing row": set("items", [{ start: 1 }]),
      "unparseable date": set("items", [{ row: "a", start: "next tuesday" }]),
      "end before start": set("items", [{ row: "a", start: 5, end: 2 }]),
      "mixed time kinds": set("items", [
        { row: "a", start: 1 },
        { row: "a", start: "2026-01-01" },
      ]),
      "milestone of the other kind": set("milestones", [{ at: 3, label: "x" }]),
      "unknown tone": set("states", [{ name: "up", tone: "green" }]),
    },
    accepts: {
      "numeric times with a unit": (p) => ({
        ...p,
        items: [{ row: "Design", start: 0, end: 3, label: "Wireframes" }],
        milestones: [{ at: 2, label: "Review", row: "Design" }],
        now: 1,
        unit: "week",
      }),
      "date-only times": set("items", [{ row: "a", start: "2026-01-05", end: "2026-01-09" }]),
    },
  },
  {
    name: "dashboard (sections)",
    guard: isDashboardPayload,
    valid: {
      title: "T",
      source: "Warehouse",
      asOf: "2026-11-18",
      note: "Excludes test accounts",
      tiles: [
        { type: "stat-panel", payload: { title: "T", items: [{ label: "A", value: 1 }] }, colSpan: 2 },
        {
          section: "Traffic",
          description: "Requests and errors",
          tiles: [{ type: "line-chart", payload: { title: "T", series: [] }, source: "Prometheus" }],
        },
      ],
    },
    rejects: {
      "section without tiles": set("tiles", [{ section: "S", tiles: [] }]),
      "nested section": set("tiles", [{ section: "S", tiles: [{ section: "Inner", tiles: [] }] }]),
      "empty section heading": set("tiles", [{ section: "", tiles: [{ type: "table", payload: {} }] }]),
      "over-long note": set("note", "x".repeat(400)),
      "non-string source": set("source", 3),
    },
    accepts: {
      "distribution tile": tile("distribution", { title: "T", groups: [] }),
      "timeline tile": tile("timeline", { title: "T", items: [] }),
      "unknown type inside a section": set("tiles", [{ section: "S", tiles: [{ type: "future-widget", payload: {} }] }]),
    },
  },
  {
    name: "bar-chart (waterfall)",
    guard: isBarChartPayload,
    valid: {
      title: "T",
      variant: "waterfall",
      totalLabel: "Closing",
      data: [
        { label: "Open", value: 100, kind: "total" },
        { label: "Up", value: 20 },
        { label: "Down", value: -5, kind: "delta" },
      ],
    },
    rejects: {
      "waterfall with series": (p) => ({ ...p, data: undefined, series: [{ name: "s", data: [{ label: "a", value: 1 }] }] }),
      "unknown kind": set("data", [{ label: "a", value: 1, kind: "subtotal" }]),
      "unknown variant": set("variant", "bridge"),
      "empty totalLabel": set("totalLabel", ""),
    },
  },
  {
    name: "info-card",
    guard: isInfoCardPayload,
    valid: {
      title: "T",
      variant: "bullet",
      items: [{ label: "a", value: 8, target: 10, bands: [5, 8], max: 12, unit: "$M" }],
    },
    rejects: {
      "missing title": omit("title"),
      "missing variant": omit("variant"),
      "unknown variant": set("variant", "donut"),
      "missing items": omit("items"),
      "empty items": set("items", []),
      "item missing value": set("items", [{ label: "a" }]),
      "max not above min": set("items", [{ label: "a", value: 1, min: 5, max: 5 }]),
      "too many bands": set("items", [{ label: "a", value: 1, bands: [1, 2, 3, 4, 5] }]),
      "fractional rankDelta": set("items", [{ label: "a", value: 1, rankDelta: 1.5 }]),
      "narrative without text": (p) => ({ ...p, variant: "narrative" }),
      "comparison without baseline": set("variant", "comparison"),
    },
    accepts: {
      "gauge with thresholds": (p) => ({
        ...p,
        variant: "gauge",
        items: [{ label: "Uptime", value: 99.9, thresholds: { warn: 99.9, critical: 99 } }],
      }),
      "narrative with text only": (p) => ({ title: p.title, variant: "narrative", text: "Revenue grew." }),
      "ranking with rank deltas": (p) => ({
        ...p,
        variant: "ranking",
        items: [
          { label: "a", value: 3, rankDelta: 1 },
          { label: "b", value: 2, rankDelta: -1 },
        ],
      }),
      "comparison with baselines": (p) => ({
        ...p,
        variant: "comparison",
        items: [{ label: "a", value: 3, baseline: 2 }],
        currentLabel: "Q3",
        baselineLabel: "Q2",
      }),
    },
  },
  {
    name: "funnel",
    guard: isFunnelPayload,
    valid: {
      title: "T",
      steps: [
        { label: "a", value: 10 },
        { label: "b", value: 0, conversionTime: "2 days" },
      ],
      followUps: ["Break down by channel"],
    },
    rejects: {
      "missing title": omit("title"),
      "missing steps": omit("steps"),
      "empty steps": set("steps", []),
      "step missing label": set("steps", [{ value: 1 }]),
      "step negative value": set("steps", [{ label: "a", value: -1 }]),
      "step non-numeric value": set("steps", [{ label: "a", value: "10" }]),
      "unknown orientation": set("orientation", "diagonal"),
      "empty followUps": set("followUps", []),
      "empty-string followUp": set("followUps", [""]),
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
      "funnel tile": tile("funnel", { title: "T", steps: [] }),
      "info-card tile": tile("info-card", { title: "T", variant: "gauge" }),
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
