// One description per payload, in zod.
//
// Each shape used to be written three times: a zod schema in `src/tools/`, a TS
// interface in `payloads.ts`, and a hand-written guard under `src/widgets/`.
// Only the first two were ever compared, and only by a human, so they drifted —
// the bar/pie/table/map guards demanded fields their schema marks optional, and
// stat-panel's checked five of twelve. See #57.
//
// Now the schema is the definition: the tool registers `<name>Schema.shape`,
// the payload type is `z.infer` of it, and the guard is `safeParse`. A field
// added here reaches all three at once.
//
// This puts zod in the widget bundles, which sounds expensive and is not: the
// MCP Apps client (`@modelcontextprotocol/ext-apps/react`, imported by
// widget-shell) already pulls zod into every one of them — a baseline bundle
// carries 20 `safeParse` call sites with none of our code mentioning zod.
// Measured on bar-chart, moving its guard cost +1.4 kB gzipped and *saved* 391
// bytes raw, the hand-written checks being bulkier than the schema.
//
// The `.describe()` text is part of the tool contract — it is what the model
// reads when choosing arguments — so it travels with the schema rather than
// staying behind in `src/tools/`.

import { z } from "zod";

const chartTitle = (of: string) => z.string().min(1).describe(of);

const colorOverride = z
  .string()
  .optional()
  .describe(
    "Optional CSS color override (e.g. '#6366F1'). If omitted, uses the theme palette.",
  );

const axisLabel = (axis: "x" | "y") =>
  z.string().optional().describe(`Label for the ${axis}-axis.`);

// ----- drill-down (bar, line, pie, funnel, heatmap, table) -------------------
//
// Only meaningful on a host that accepts messages from a widget; elsewhere the
// field is ignored and a click does what it always did.

const followUpsField = z
  .array(z.string().min(1).max(80))
  .min(1)
  .max(6)
  .optional()
  .describe(
    "Optional drill-down menu. When the user clicks a mark (a bar, a point, a slice, a funnel step, a cell, a table row) the widget offers these as short follow-up questions; the picked one is sent to you as the user's next message with the mark and chart title appended. Name the dimensions the data really has, e.g. ['Break down by product', 'Compare with last year']. Omit for the defaults: break down, why, show rows.",
  );

// ----- reference layer (bar, line, scatter) ----------------------------------
//
// One authored-context field shared by the three cartesian charts: targets,
// thresholds, averages, goal bands. The rendering lives in one place too
// (widgets/shared/ReferenceLayer.tsx), so a tone means the same colour
// everywhere and a band never relies on colour alone — it always carries its
// label.

const axisValue = z.union([z.string(), z.number()]);

const referenceItem = (numeric: boolean) => {
  const value = numeric ? z.number() : axisValue;
  return z
    .object({
      axis: z
        .enum(["x", "y"])
        .describe(
          numeric
            ? "Which axis the value sits on. 'y' draws a horizontal line or band, 'x' a vertical one."
            : "Which axis the value sits on. 'y' is the value axis (a target, threshold or average); 'x' is the category / x axis (a launch date, a marked category). On a horizontal bar chart 'y' still means the value axis.",
        ),
      kind: z
        .enum(["line", "band"])
        .describe("'line' marks one value (needs `value`); 'band' shades a range (needs `from` and `to`)."),
      value: value
        .optional()
        .describe("Line only: where the line sits. A number on the value axis, or an x value / category label on the x axis."),
      from: value.optional().describe("Band only: start of the range."),
      to: value.optional().describe("Band only: end of the range."),
      label: z
        .string()
        .optional()
        .describe("Short text drawn next to the line or band, e.g. 'Target', 'SLA 99.9%', 'Q3 plan'. Strongly recommended: it is what tells the reader what the line means."),
      tone: z
        .enum(["neutral", "success", "warning", "danger"])
        .optional()
        .describe("Meaning of the mark. 'neutral' (default) for averages and plans, 'success' for a goal, 'warning' / 'danger' for thresholds and limits."),
    })
    .superRefine((ref, ctx) => {
      if (ref.kind === "line" && ref.value === undefined) {
        ctx.addIssue({ code: "custom", path: ["value"], message: "A reference line needs `value`." });
      }
      if (ref.kind === "band" && (ref.from === undefined || ref.to === undefined)) {
        // Template literals on purpose: the import scan in server-deps.test.ts
        // reads the word before a double-quoted string as a module specifier.
        ctx.addIssue({
          code: "custom",
          path: [ref.from === undefined ? `from` : `to`],
          message: "A reference band needs both `from` and `to`.",
        });
      }
    });
};

const referenceField = (numeric = false) =>
  z
    .array(referenceItem(numeric))
    .optional()
    .describe(
      "Optional reference marks: target / goal lines, thresholds, averages, acceptable ranges. Use whenever the user mentions a target, plan, limit, SLA or 'compared with the goal'. Each line or band should carry a `label`.",
    );

export type ReferenceMark = z.infer<ReturnType<typeof referenceItem>>;
export type ReferenceTone = NonNullable<ReferenceMark["tone"]>;

// ----- bar chart -------------------------------------------------------------

const barDatumSchema = z.object({
  label: z
    .string()
    .min(1)
    .describe("Category label (x-axis for vertical, y-axis for horizontal)."),
  value: z.number().describe("Numeric value controlling bar length."),
  color: colorOverride,
  kind: z
    .enum(["delta", "total"])
    .optional()
    .describe(
      "Waterfall only. 'delta' (default): a signed change added to the running total (+120 new customers, −40 churn). 'total': a level drawn from zero, e.g. the opening balance (make the FIRST item a 'total') or a known subtotal; the running total restarts from its value.",
    ),
});

const barSeriesSchema = z.object({
  name: z.string().min(1).describe("Series name. Appears in the legend and tooltip."),
  data: z
    .array(
      z.object({
        label: z
          .string()
          .min(1)
          .describe("Category label. Series share categories by label; a category a series lacks is simply empty for it."),
        value: z.number().describe("Value of this series in this category. May be negative."),
      }),
    )
    .min(1)
    .describe("One value per category for this series."),
  color: z
    .string()
    .optional()
    .describe("Optional CSS color for the whole series. If omitted, uses the theme palette."),
  mark: z
    .enum(["bar", "line"])
    .optional()
    .describe(
      "How the series is drawn. 'bar' (default) or 'line' — a line over the bars, e.g. a target, an average or a rate across the same categories. Line series are never stacked.",
    ),
  axis: z
    .enum(["left", "right"])
    .optional()
    .describe(
      "Value axis for this series. Defaults to 'left' (shared axis). Use 'right' ONLY when the series has a different unit (e.g. margin % over revenue $); it requires `ylabelRight`. Two axes with the same unit mislead — keep them on one axis.",
    ),
});

export const barChartSchema = z
  .object({
    title: chartTitle("Chart title shown above the bars."),
    followUps: followUpsField,
    variant: z
      .enum(["bars", "waterfall"])
      .optional()
      .describe(
        "'bars' (default): ordinary bars. 'waterfall': a bridge from a start value to an end value — each `data` item is a step that floats from the running total (rises blue, falls orange, signed labels), 'total' items stand on zero. Use for P&L bridges, ARR / MRR movements (start → new → expansion → churn → end), budget vs actual, headcount changes. Needs `data`, not `series`.",
      ),
    totalLabel: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Waterfall only: label of the closing bar, which the chart computes (start plus every change) and appends unless the last item is already a 'total'. Defaults to 'Total'; e.g. 'End of Q3'.",
      ),
    data: z
      .array(barDatumSchema)
      .min(1)
      .optional()
      .describe(
        "Single-series bars: one entry per category. Provide either `data` or `series`, not both.",
      ),
    series: z
      .array(barSeriesSchema)
      .min(1)
      .optional()
      .describe(
        "Multi-series bars: several values per category (e.g. revenue by region AND quarter). Categories are the union of every series' labels, in first-seen order. Provide either `data` or `series`, not both.",
      ),
    stack: z
      .enum(["none", "normal", "percent"])
      .optional()
      .describe(
        "Multi-series only. 'none' (default): bars side by side, for comparing series within a category. 'normal': stacked, for parts that add up to a total (negative parts go below zero — e.g. MRR new / expansion / churn). 'percent': stacked to 100%, for comparing composition across categories.",
      ),
    orientation: z
      .enum(["vertical", "horizontal"])
      .optional()
      .describe("Bar orientation. Defaults to 'vertical'. Line marks and a right axis need 'vertical'."),
    xlabel: axisLabel("x"),
    ylabel: axisLabel("y"),
    ylabelRight: z
      .string()
      .optional()
      .describe("Label for the right value axis. Required when any series uses `axis: 'right'`."),
    reference: referenceField(),
  })
  .superRefine((p, ctx) => {
    if (p.variant === "waterfall" && p.series !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["series"],
        message: "A waterfall takes `data` (one step per item), not `series`.",
      });
    }
    if (p.data === undefined && p.series === undefined) {
      ctx.addIssue({ code: "custom", path: ["data"], message: "Provide `data` or `series`." });
    }
    if (p.data !== undefined && p.series !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["series"],
        message: "`data` and `series` are mutually exclusive — use one.",
      });
    }
    for (const [i, s] of (p.series ?? []).entries()) {
      if (s.axis === "right" && !p.ylabelRight) {
        ctx.addIssue({
          code: "custom",
          path: ["series", i, "axis"],
          message: "`axis: 'right'` requires `ylabelRight` — a second axis must say what it measures.",
        });
      }
      if (p.orientation === "horizontal" && (s.mark === "line" || s.axis === "right")) {
        ctx.addIssue({
          code: "custom",
          path: ["series", i, s.mark === "line" ? "mark" : "axis"],
          message: "Line marks and a right axis are only supported on vertical bar charts.",
        });
      }
      if (s.mark === "line" && p.stack === "percent" && s.axis !== "right") {
        ctx.addIssue({
          code: "custom",
          path: ["series", i, "axis"],
          message: "A line over a percent stack must use `axis: 'right'` — its values are not percentages.",
        });
      }
    }
  });

export type BarChartPayload = z.infer<typeof barChartSchema>;
export type BarDatum = z.infer<typeof barDatumSchema>;
export type BarSeries = z.infer<typeof barSeriesSchema>;
export type BarStack = NonNullable<BarChartPayload["stack"]>;
export type Orientation = NonNullable<BarChartPayload["orientation"]>;

// ----- line chart ------------------------------------------------------------

const linePointSchema = z.object({
  x: axisValue.describe(
    "X-axis value. Strings form category axis; numbers form numeric axis.",
  ),
  y: z.number().describe("Y-axis value for this point."),
});

export const lineChartSchema = z.object({
  title: chartTitle("Chart title shown above the lines."),
  followUps: followUpsField,
  series: z
    .array(
      z.object({
        name: z
          .string()
          .min(1)
          .describe("Series name. Appears in the legend and tooltip."),
        data: z
          .array(linePointSchema)
          .min(1)
          .describe("Ordered points for this series. Provide at least one."),
        compare: z
          .object({
            label: z
              .string()
              .min(1)
              .optional()
              .describe("What the baseline is, e.g. 'Last month', 'Last year', 'Plan'. Defaults to 'Previous'."),
            data: z
              .array(linePointSchema)
              .min(1)
              .describe(
                "Baseline points on the SAME x values as the series (e.g. last month's revenue re-keyed to this month's days). Points are matched by x.",
              ),
          })
          .optional()
          .describe(
            "Optional comparison baseline for this series — previous period, last year, plan. Drawn as a faint dashed line in the series' colour; the tooltip shows the value, the baseline and the change in % and absolute. Use when the user asks to compare with a previous period.",
          ),
      }),
    )
    .min(1)
    .describe("One or more series to overlay. Provide at least one."),
  xlabel: axisLabel("x"),
  ylabel: axisLabel("y"),
  reference: referenceField(),
  annotations: z
    .array(
      z.object({
        x: axisValue.describe("Where the event happened, on the x axis."),
        label: z.string().min(1).describe("Short event name, e.g. 'Release 2.0', 'Outage', 'Price change'."),
        x2: axisValue
          .optional()
          .describe("Optional end of the event; when given the annotation shades the region from `x` to `x2`."),
      }),
    )
    .optional()
    .describe(
      "Optional event markers: releases, incidents, campaigns. A vertical marker at `x`, or a shaded region `x`..`x2`, labelled. Use to explain 'what happened here'.",
    ),
  partialFrom: axisValue
    .optional()
    .describe(
      "Optional x value from which data is incomplete (the current, unfinished period). The line is dashed from this point on and the tooltip marks those values as incomplete, so a partial month is not read as a drop.",
    ),
});

export type LineChartPayload = z.infer<typeof lineChartSchema>;
export type LineSeries = LineChartPayload["series"][number];
export type LineDatum = LineSeries["data"][number];
export type LineAnnotation = NonNullable<LineChartPayload["annotations"]>[number];

// ----- pie chart -------------------------------------------------------------

export const pieChartSchema = z.object({
  title: chartTitle("Chart title shown above the pie."),
  followUps: followUpsField,
  data: z
    .array(
      z.object({
        label: z.string().min(1).describe("Slice label shown in the tooltip and legend."),
        value: z
          .number()
          .nonnegative()
          .describe("Slice value (non-negative). Percentages are computed as value / sum."),
        color: colorOverride,
      }),
    )
    .min(1)
    .describe("Slices of the pie. Provide at least one positive-valued entry."),
  variant: z
    .enum(["pie", "donut"])
    .optional()
    .describe("Chart variant. Defaults to 'donut'."),
  maxSegments: z
    .number()
    .int()
    .min(2)
    .optional()
    .describe(
      "Maximum rendered slices (integer >= 2; default 5). Extra slices collapse into a click-to-expand 'Other' slice; CSV export keeps all rows.",
    ),
});

export type PieChartPayload = z.infer<typeof pieChartSchema>;
export type PieDatum = PieChartPayload["data"][number];
export type PieVariant = NonNullable<PieChartPayload["variant"]>;

// ----- scatter chart ---------------------------------------------------------

export const scatterChartSchema = z.object({
  title: chartTitle("Chart title shown above the plot."),
  series: z
    .array(
      z.object({
        name: z.string().min(1).describe("Series name shown in the legend and tooltip."),
        data: z
          .array(
            z.object({
              x: z.number().describe("Numeric x coordinate."),
              y: z.number().describe("Numeric y coordinate."),
              size: z
                .number()
                .positive()
                .optional()
                .describe(
                  "Optional point size in arbitrary units; encodes a third numeric variable. If omitted, points use a uniform size.",
                ),
            }),
          )
          .min(1)
          .describe("Data points for this series. Provide at least one point."),
      }),
    )
    .min(1)
    .describe("One or more series. Each renders in a distinct color from the palette."),
  xlabel: axisLabel("x"),
  ylabel: axisLabel("y"),
  reference: referenceField(true),
});

export type ScatterChartPayload = z.infer<typeof scatterChartSchema>;
export type ScatterSeries = ScatterChartPayload["series"][number];
export type ScatterDatum = ScatterSeries["data"][number];

// ----- treemap ---------------------------------------------------------------

// Recursive via a getter, which is zod 4's way and the only one `z.infer` can
// follow. A payload nested deeply enough makes safeParse throw a RangeError
// rather than answer false — the same behaviour the hand-written guard had, and
// what Tile's try/catch around every guard call exists for.
const treemapNodeSchema = z.object({
  label: z.string().min(1).describe("Node label shown in the rectangle and tooltip."),
  value: z
    .number()
    .nonnegative()
    .describe(
      "Numeric value controlling rectangle area. For parents with children, may be omitted (set to 0) — sum of children is used.",
    ),
  color: colorOverride,
  get children(): z.ZodOptional<z.ZodArray<typeof treemapNodeSchema>> {
    return z.array(treemapNodeSchema).optional();
  },
});

export const treemapSchema = z.object({
  title: chartTitle("Chart title shown above the treemap."),
  data: z
    .array(treemapNodeSchema)
    .min(1)
    .describe("Top-level nodes. Each may have nested children for hierarchical layouts."),
});

export type TreemapPayload = z.infer<typeof treemapSchema>;
export type TreemapNode = z.infer<typeof treemapNodeSchema>;

// ----- colour scale (heatmap, map) -------------------------------------------

const colorScaleFields = {
  scale: z
    .enum(["sequential", "diverging"])
    .optional()
    .describe(
      "Colour scale. 'sequential' (default): one hue, light → dark for low → high; use for magnitudes that only grow (counts, revenue, activity). 'diverging': blue below `midpoint`, orange above, neutral at it; use when values have a meaningful centre — change vs plan, growth rates, correlations, profit and loss.",
    ),
  midpoint: z
    .number()
    .optional()
    .describe(
      "Diverging scale only: the value shown as neutral — usually 0, a target, or an average. Defaults to 0. The further side sets the extremes; the nearer side is not stretched.",
    ),
};

// ----- heatmap ---------------------------------------------------------------

export const heatmapSchema = z.object({
  title: chartTitle("Chart title shown above the matrix."),
  followUps: followUpsField,
  xLabels: z
    .array(z.string().min(1))
    .min(1)
    .describe("Column labels along the x-axis (one per matrix column)."),
  yLabels: z
    .array(z.string().min(1))
    .min(1)
    .describe("Row labels along the y-axis (one per matrix row)."),
  cells: z
    .array(
      z.object({
        x: z.number().int().nonnegative().describe("Column index into xLabels (0-based)."),
        y: z.number().int().nonnegative().describe("Row index into yLabels (0-based)."),
        value: z.number().describe("Numeric intensity for this cell."),
      }),
    )
    .min(1)
    .describe(
      "Cells of the matrix. Missing (x, y) combinations are rendered empty. Out-of-range indices are ignored.",
    ),
  xlabel: z.string().optional().describe("Axis label for the x-axis."),
  ylabel: z.string().optional().describe("Axis label for the y-axis."),
  ...colorScaleFields,
  mode: z
    .enum(["matrix", "cohort"])
    .optional()
    .describe(
      "'matrix' (default): a plain value grid. 'cohort': a retention / cohort table — one row per cohort (yLabels, e.g. signup month), one column per period since start (xLabels, e.g. 'M0', 'M1', …), each cell a PERCENTAGE (42.5 means 42.5%; above 100 is fine for net revenue retention). Adds a cohort-size column and an average row, prints the % in each cell, and leaves periods a cohort has not reached yet empty — omit those cells, never send 0 for them.",
    ),
  cohortSizes: z
    .array(z.number().nonnegative())
    .optional()
    .describe(
      "Cohort mode only: how many users / accounts each cohort started with, one per yLabels entry in the same order. Shown as the size column and used to weight the average row. Without it the average is a plain mean of the cohorts that reached each period.",
    ),
}).superRefine((p, ctx) => {
  if (p.cohortSizes !== undefined && p.cohortSizes.length !== p.yLabels.length) {
    ctx.addIssue({
      code: "custom",
      path: ["cohortSizes"],
      message: "`cohortSizes` needs exactly one entry per `yLabels` row.",
    });
  }
});

export type HeatmapPayload = z.infer<typeof heatmapSchema>;
export type HeatmapCell = HeatmapPayload["cells"][number];

// ----- map -------------------------------------------------------------------

export const mapSchema = z.object({
  title: chartTitle("Chart title shown above the map."),
  scope: z
    .enum(["world", "us-states"])
    .optional()
    .describe("Base map: 'world' (countries) or 'us-states' (US states). Defaults to 'world'."),
  variant: z
    .enum(["choropleth", "bubble"])
    .optional()
    .describe(
      "Encoding: 'choropleth' (shade regions from `data`) or 'bubble' (sized markers from `points`). Defaults to 'choropleth'.",
    ),
  data: z
    .array(
      z.object({
        id: z
          .string()
          .min(1)
          .describe(
            "Region identifier. World: ISO 3166-1 alpha-3 (preferred, e.g. 'USA'), alpha-2, numeric, or common English name. US states: USPS code (preferred, e.g. 'CA'), full name, or FIPS.",
          ),
        value: z.number().describe("Numeric value shading this region."),
        label: z
          .string()
          .optional()
          .describe("Optional display-name override for the tooltip."),
      }),
    )
    .optional()
    .describe("Choropleth regions (required for variant 'choropleth'). One entry per region."),
  points: z
    .array(
      z.object({
        lat: z.number().describe("Latitude in degrees (−90..90)."),
        lon: z.number().describe("Longitude in degrees (−180..180)."),
        value: z.number().describe("Non-negative magnitude controlling the marker area."),
        label: z.string().optional().describe("Label shown in the tooltip."),
      }),
    )
    .optional()
    .describe("Bubble markers (required for variant 'bubble'). One entry per point."),
  valueLabel: z
    .string()
    .optional()
    .describe("Optional label for the value in the tooltip and legend, e.g. 'GDP per capita'."),
  ...colorScaleFields,
});

export type MapPayload = z.infer<typeof mapSchema>;
export type MapRegionDatum = NonNullable<MapPayload["data"]>[number];
export type MapPoint = NonNullable<MapPayload["points"]>[number];
export type MapScope = NonNullable<MapPayload["scope"]>;
export type MapVariant = NonNullable<MapPayload["variant"]>;

// ----- sankey ----------------------------------------------------------------

export const sankeySchema = z.object({
  title: chartTitle("Chart title shown above the diagram."),
  nodes: z
    .array(
      z.object({
        name: z
          .string()
          .min(1)
          .describe("Unique node name; links reference nodes by this name."),
        color: z
          .string()
          .optional()
          .describe(
            "Optional CSS color override for this node and its outgoing links. Defaults to the palette.",
          ),
      }),
    )
    .optional()
    .describe(
      "Optional explicit node list controlling column order and colors. When omitted, nodes are derived from the links in first-appearance order.",
    ),
  links: z
    .array(
      z.object({
        source: z.string().min(1).describe("Name of the node this flow leaves."),
        target: z.string().min(1).describe("Name of the node this flow enters."),
        value: z
          .number()
          .nonnegative()
          .describe("Non-negative flow magnitude; controls the ribbon width."),
      }),
    )
    .min(1)
    .describe("Directed flows between nodes. The graph must be acyclic."),
  valueLabel: z
    .string()
    .optional()
    .describe('Optional label for the flow value in the tooltip, e.g. "users".'),
});

export type SankeyPayload = z.infer<typeof sankeySchema>;
export type SankeyNode = NonNullable<SankeyPayload["nodes"]>[number];
export type SankeyLink = SankeyPayload["links"][number];

// ----- funnel ----------------------------------------------------------------

export const funnelSchema = z.object({
  title: chartTitle("Chart title shown above the funnel."),
  steps: z
    .array(
      z.object({
        label: z.string().min(1).describe("Stage name, e.g. 'Visited pricing'."),
        value: z
          .number()
          .nonnegative()
          .describe("How many reached this stage (users, sessions, deals). Non-negative."),
        conversionTime: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Optional typical time from the previous stage to this one, as display text, e.g. '2.4 days' or 'median 3 h'. Ignored on the first step.",
          ),
      }),
    )
    .min(1)
    .max(20)
    .describe(
      "Stages in order, first (widest) to last. Each value is the count that reached that stage. A step larger than the one before it is drawn and flagged, not hidden.",
    ),
  orientation: z
    .enum(["horizontal", "vertical"])
    .optional()
    .describe(
      "'horizontal' (default): one row per stage, bars grow rightwards — best for long stage names. 'vertical': stages left to right as columns.",
    ),
  showDropOff: z
    .boolean()
    .optional()
    .describe(
      "Show the loss between consecutive stages and call out the largest one. Defaults to true.",
    ),
  valueLabel: z
    .string()
    .optional()
    .describe("What the values count, e.g. 'users'. Shown in the tooltip and the header."),
  followUps: followUpsField,
});

export type FunnelPayload = z.infer<typeof funnelSchema>;
export type FunnelStep = FunnelPayload["steps"][number];

// ----- info card -------------------------------------------------------------
//
// One tool for "one value against something": a target (bullet, progress), a
// set of thresholds (gauge), the other entries (ranking), an earlier period
// (comparison), or a few sentences of context (narrative). Variants rather
// than tools, to keep the tool list short (plan decision R3).

export const INFO_CARD_VARIANTS = [
  "bullet",
  "gauge",
  "progress",
  "ranking",
  "comparison",
  "narrative",
] as const;

const infoCardItemSchema = z.object({
  label: z.string().min(1).describe("Metric or entry name, e.g. 'Q3 revenue', 'EMEA'."),
  value: z.number().describe("The actual value."),
  unit: z
    .string()
    .optional()
    .describe("Unit shown after the value, e.g. '%', 'ms', '$K'. Formatting only."),
  target: z
    .number()
    .optional()
    .describe("bullet / progress / gauge: the goal. Drawn as a marker (bullet, gauge) or as the end of the bar (progress)."),
  min: z
    .number()
    .optional()
    .describe("bullet / gauge / progress: start of the scale. Defaults to 0 (or the lowest value given, if below 0)."),
  max: z
    .number()
    .optional()
    .describe("bullet / gauge / progress: end of the scale. Defaults to a round number above the largest of value, target, bands and thresholds. A value outside min..max is drawn at the edge and flagged."),
  bands: z
    .array(z.number())
    .min(1)
    .max(4)
    .optional()
    .describe("bullet only: qualitative range boundaries between min and max, ascending, e.g. [60, 80] for poor < 60 ≤ fair < 80 ≤ good. Drawn as grey shades behind the bar."),
  thresholds: z
    .object({
      warn: z.number().describe("Where 'Warning' starts."),
      critical: z.number().describe("Where 'Critical' starts."),
    })
    .optional()
    .describe("gauge (also bullet / progress): status thresholds. With higherIsBetter (default) a value below `warn` is Warning and below `critical` is Critical, e.g. uptime { warn: 99.9, critical: 99 }; with higherIsBetter false, above them, e.g. p95 latency { warn: 300, critical: 500 }. The status is printed as text as well as colour."),
  higherIsBetter: z
    .boolean()
    .optional()
    .describe("Whether a larger value is good. Defaults to true. Flips thresholds, target status and comparison colours."),
  rankDelta: z
    .number()
    .int()
    .optional()
    .describe("ranking only: places moved since the previous period. Positive = moved up (▲), negative = moved down (▼), 0 = unchanged. Omit when unknown."),
  baseline: z
    .number()
    .optional()
    .describe("comparison only (required there): the value it is compared with, e.g. last quarter."),
  caption: z.string().optional().describe("Small text under the item, e.g. 'fiscal year to date'."),
});

export const infoCardSchema = z
  .object({
    title: chartTitle("Card title shown above the content."),
    variant: z
      .enum(INFO_CARD_VARIANTS)
      .describe(
        "'bullet': actual vs target on a linear scale with qualitative bands — the compact choice for several KPIs against plan. 'gauge': a dial with ok / warning / critical zones from `thresholds` — use for one or a few health metrics (uptime, utilisation, NPS). 'progress': a bar filling towards `target` (quota, goal, budget used). 'ranking': a leaderboard — entries in rank order, each with a share meter and optional `rankDelta` arrows. 'comparison': each item's `value` against its `baseline` with the absolute and % change. 'narrative': a short written summary in `text`, optionally with `items` as key figures.",
      ),
    items: z
      .array(infoCardItemSchema)
      .min(1)
      .max(20)
      .optional()
      .describe(
        "The values. Required for every variant except 'narrative'. ranking: pass entries already in rank order, best first; up to 20.",
      ),
    text: z
      .string()
      .min(1)
      .max(1200)
      .optional()
      .describe(
        "narrative only (required there): two to four short sentences of plain text — what changed and why it matters. Separate paragraphs with a blank line. No Markdown.",
      ),
    currentLabel: z
      .string()
      .optional()
      .describe("comparison only: name of the current period, e.g. 'Q3 2026'. Defaults to 'Current'."),
    baselineLabel: z
      .string()
      .optional()
      .describe("comparison only: name of the baseline, e.g. 'Q3 2025'. Defaults to 'Previous'."),
  })
  .superRefine((p, ctx) => {
    if (p.variant === "narrative") {
      if (p.text === undefined) {
        ctx.addIssue({ code: "custom", path: ["text"], message: "A narrative card needs `text`." });
      }
    } else if (p.items === undefined) {
      ctx.addIssue({ code: "custom", path: ["items"], message: `A ${p.variant} card needs \`items\`.` });
    }
    for (const [i, item] of (p.items ?? []).entries()) {
      if (item.min !== undefined && item.max !== undefined && item.max <= item.min) {
        ctx.addIssue({ code: "custom", path: ["items", i, "max"], message: "`max` must be greater than `min`." });
      }
      if (p.variant === "comparison" && item.baseline === undefined) {
        ctx.addIssue({ code: "custom", path: ["items", i, "baseline"], message: "A comparison item needs `baseline`." });
      }
    }
  });

export type InfoCardPayload = z.infer<typeof infoCardSchema>;
export type InfoCardItem = z.infer<typeof infoCardItemSchema>;
export type InfoCardVariant = InfoCardPayload["variant"];

// ----- stat panel ------------------------------------------------------------

export const statPanelSchema = z.object({
  title: chartTitle("Panel title shown above the metric cards."),
  items: z
    .array(
      z.object({
        label: z.string().min(1).describe("Metric name, e.g. 'Active users'."),
        value: z
          .union([z.string(), z.number()])
          .describe(
            "Headline figure. Numbers are grouped/formatted; pass a string to control formatting yourself.",
          ),
        unit: z
          .string()
          .optional()
          .describe("Unit shown after the value, e.g. 'ms', '%', 'GB'."),
        delta: z
          .number()
          .optional()
          .describe(
            "Signed change vs the comparison period; shows a coloured up/down arrow.",
          ),
        deltaUnit: z.string().optional().describe("Unit for the delta. Defaults to '%'."),
        deltaCaption: z
          .string()
          .optional()
          .describe("Caption beside the delta, e.g. 'vs last week'."),
        higherIsBetter: z
          .boolean()
          .optional()
          .describe(
            "Whether a rising value is good — controls delta colour. Defaults to true.",
          ),
        description: z.string().optional().describe("Small caption under the value."),
        status: z
          .enum(["success", "warning", "danger", "info"])
          .optional()
          .describe("Optional semantic accent bar on the card."),
        trend: z
          .array(z.number())
          .optional()
          .describe(
            "Recent values (oldest→newest) drawn as a compact sparkline at the bottom of the card.",
          ),
        target: z
          .number()
          .optional()
          .describe(
            "Goal for the metric; with a numeric value, draws a progress bar toward this target.",
          ),
        badge: z
          .string()
          .optional()
          .describe("Short status pill shown next to the label, coloured by `status`."),
      }),
    )
    .min(1)
    .describe("Array of metric cards. Provide at least one."),
  columns: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .describe("Optional fixed column count (1–4). Defaults to an auto-fit grid."),
});

export type StatPanelPayload = z.infer<typeof statPanelSchema>;
export type StatItem = StatPanelPayload["items"][number];
export type StatStatus = NonNullable<StatItem["status"]>;

// ----- table -----------------------------------------------------------------

export const tableSchema = z.object({
  title: chartTitle("Table title shown above the rows."),
  followUps: followUpsField,
  columns: z
    .array(
      z.object({
        key: z
          .string()
          .min(1)
          .describe("Property name in each row matching this column's cell."),
        label: z.string().min(1).describe("Human-readable column header."),
        align: z
          .enum(["left", "right", "center"])
          .optional()
          .describe(
            "Cell alignment. Defaults to 'right' for numeric columns, 'left' otherwise.",
          ),
        kind: z
          .enum(["text", "sparkline"])
          .optional()
          .describe(
            "Cell rendering mode, default 'text'. 'sparkline' renders each cell's number array (oldest → newest) as a 56×16 inline trend line plus the latest value.",
          ),
      }),
    )
    .min(1)
    .describe("Column definitions in display order."),
  rows: z
    .array(z.record(z.string(), z.union([z.string(), z.number(), z.array(z.number())])))
    .describe(
      "Rows as objects keyed by column.key. Number arrays are only valid under kind 'sparkline' columns. Empty is allowed.",
    ),
  sortable: z
    .boolean()
    .optional()
    .describe("Enable click-to-sort on column headers. Defaults to true."),
  filterable: z
    .boolean()
    .optional()
    .describe("Show a case-insensitive search box above the table. Defaults to true."),
});

export type TablePayload = z.infer<typeof tableSchema>;
export type TableColumn = TablePayload["columns"][number];
export type TableRow = TablePayload["rows"][number];
export type TableCell = TableRow[string];
export type ColumnAlign = NonNullable<TableColumn["align"]>;
export type ColumnKind = NonNullable<TableColumn["kind"]>;

// ----- dashboard -------------------------------------------------------------

/**
 * The widgets that may appear as a dashboard tile: every registered widget
 * except `dashboard` itself, which cannot nest.
 *
 * Not derived from `WIDGETS` directly: the registry imports every tool module,
 * and this file is reachable from the widget bundles, so the import would drag
 * the server into all twelve of them. `registry.test.ts` pins it instead.
 */
export const DASHBOARD_TILE_TYPES = [
  "bar-chart",
  "line-chart",
  "pie-chart",
  "table",
  "scatter-chart",
  "treemap",
  "heatmap",
  "stat-panel",
  "sankey",
  "map",
  "funnel",
  "info-card",
] as const;

export type DashboardTileType = (typeof DASHBOARD_TILE_TYPES)[number];

export const dashboardSchema = z.object({
  title: chartTitle("Dashboard title shown above the tiles."),
  columns: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .describe("Grid column count. Defaults to 2."),
  tiles: z
    .array(
      z.object({
        type: z.enum(DASHBOARD_TILE_TYPES).describe("Which widget to render in this tile."),
        payload: z
          .record(z.string(), z.unknown())
          .describe(
            "The referenced widget's own payload — the same object its render_<type> tool accepts (e.g. a bar-chart tile takes { title, data, orientation }).",
          ),
        colSpan: z
          .number()
          .int()
          .min(1)
          .max(4)
          .optional()
          .describe("How many columns this tile spans (1..columns). Defaults to 1."),
      }),
    )
    .min(1)
    .describe("Ordered list of tiles laid out left-to-right, top-to-bottom."),
});

type InferredDashboard = z.infer<typeof dashboardSchema>;

/**
 * Widened past the schema's enum on purpose, and the one place a payload type
 * is not simply `z.infer`. An unrecognised type stays representable so the
 * dashboard degrades that one tile — a newer server talking to a cached older
 * bundle — rather than rejecting the whole grid. The union keeps autocomplete
 * on the types that actually render.
 */
export type DashboardTile = Omit<InferredDashboard["tiles"][number], "type"> & {
  type: DashboardTileType | (string & {});
};

export type DashboardPayload = Omit<InferredDashboard, "tiles"> & {
  tiles: DashboardTile[];
};
