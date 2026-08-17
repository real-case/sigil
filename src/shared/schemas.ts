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

// ----- bar chart -------------------------------------------------------------

export const barChartSchema = z.object({
  title: chartTitle("Chart title shown above the bars."),
  data: z
    .array(
      z.object({
        label: z
          .string()
          .min(1)
          .describe("Category label (x-axis for vertical, y-axis for horizontal)."),
        value: z.number().describe("Numeric value controlling bar length."),
        color: colorOverride,
      }),
    )
    .min(1)
    .describe("Array of bars. Provide at least one data point."),
  orientation: z
    .enum(["vertical", "horizontal"])
    .optional()
    .describe("Bar orientation. Defaults to 'vertical'."),
  xlabel: axisLabel("x"),
  ylabel: axisLabel("y"),
});

export type BarChartPayload = z.infer<typeof barChartSchema>;
export type BarDatum = BarChartPayload["data"][number];
export type Orientation = NonNullable<BarChartPayload["orientation"]>;

// ----- line chart ------------------------------------------------------------

export const lineChartSchema = z.object({
  title: chartTitle("Chart title shown above the lines."),
  series: z
    .array(
      z.object({
        name: z
          .string()
          .min(1)
          .describe("Series name. Appears in the legend and tooltip."),
        data: z
          .array(
            z.object({
              x: z
                .union([z.string(), z.number()])
                .describe(
                  "X-axis value. Strings form category axis; numbers form numeric axis.",
                ),
              y: z.number().describe("Y-axis value for this point."),
            }),
          )
          .min(1)
          .describe("Ordered points for this series. Provide at least one."),
      }),
    )
    .min(1)
    .describe("One or more series to overlay. Provide at least one."),
  xlabel: axisLabel("x"),
  ylabel: axisLabel("y"),
});

export type LineChartPayload = z.infer<typeof lineChartSchema>;
export type LineSeries = LineChartPayload["series"][number];
export type LineDatum = LineSeries["data"][number];

// ----- pie chart -------------------------------------------------------------

export const pieChartSchema = z.object({
  title: chartTitle("Chart title shown above the pie."),
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

// ----- heatmap ---------------------------------------------------------------

export const heatmapSchema = z.object({
  title: chartTitle("Chart title shown above the matrix."),
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
 * the server into all eleven of them. `registry.test.ts` pins it instead.
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
