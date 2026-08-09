export type Orientation = "vertical" | "horizontal";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartPayload {
  title: string;
  data: BarDatum[];
  orientation: Orientation;
  xlabel?: string;
  ylabel?: string;
}

export interface LineDatum {
  x: string | number;
  y: number;
}

export interface LineSeries {
  name: string;
  data: LineDatum[];
}

export interface LineChartPayload {
  title: string;
  series: LineSeries[];
  xlabel?: string;
  ylabel?: string;
}

export type PieVariant = "pie" | "donut";

export interface PieDatum {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartPayload {
  title: string;
  data: PieDatum[];
  variant: PieVariant;
  /**
   * Maximum number of rendered slices (integer >= 2; default 5). When `data`
   * has more entries, the smallest remainder collapses into a single
   * click-to-expand "Other" slice. Visual only — CSV export keeps every row.
   */
  maxSegments?: number;
}

export interface ScatterDatum {
  x: number;
  y: number;
  size?: number;
}

export interface ScatterSeries {
  name: string;
  data: ScatterDatum[];
}

export interface ScatterChartPayload {
  title: string;
  series: ScatterSeries[];
  xlabel?: string;
  ylabel?: string;
}

export interface TreemapNode {
  label: string;
  value: number;
  color?: string;
  children?: TreemapNode[];
}

export interface TreemapPayload {
  title: string;
  data: TreemapNode[];
}

export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
}

export interface HeatmapPayload {
  title: string;
  xLabels: string[];
  yLabels: string[];
  cells: HeatmapCell[];
  xlabel?: string;
  ylabel?: string;
}

/** Base map for the map widget: world countries or US states. */
export type MapScope = "world" | "us-states";

/**
 * How the map encodes data: region shading (`choropleth`, driven by `data`)
 * or sized markers at coordinates (`bubble`, driven by `points`).
 */
export type MapVariant = "choropleth" | "bubble";

export interface MapRegionDatum {
  /**
   * Region identifier: ISO 3166-1 alpha-3 (e.g. "USA"), alpha-2 ("US"),
   * numeric ("840"), or a common English country name ("United States").
   */
  id: string;
  /** Numeric intensity shading this region. */
  value: number;
  /** Optional display-name override for the tooltip (defaults to the country name). */
  label?: string;
}

export interface MapPoint {
  /** Latitude in degrees (−90..90). */
  lat: number;
  /** Longitude in degrees (−180..180). */
  lon: number;
  /** Non-negative magnitude controlling the marker's area. */
  value: number;
  /** Label shown in the tooltip. */
  label?: string;
}

export interface MapPayload {
  title: string;
  scope: MapScope;
  variant: MapVariant;
  /** Choropleth regions (used when variant is "choropleth"). */
  data?: MapRegionDatum[];
  /** Bubble markers at coordinates (used when variant is "bubble"). */
  points?: MapPoint[];
  /** Optional label for the value in the tooltip and legend, e.g. "GDP per capita". */
  valueLabel?: string;
}

export interface SankeyNode {
  /** Unique node name; links reference nodes by this name. */
  name: string;
  /** Optional CSS color override for this node (and its outgoing links). */
  color?: string;
}

export interface SankeyLink {
  /** Name of the node this flow leaves. */
  source: string;
  /** Name of the node this flow enters. */
  target: string;
  /** Non-negative flow magnitude; controls the ribbon width. */
  value: number;
}

export interface SankeyPayload {
  title: string;
  /**
   * Optional explicit node list controlling order and per-node colors. When
   * omitted, nodes are derived from the links in first-appearance order.
   */
  nodes?: SankeyNode[];
  /** Directed flows between nodes. The graph must be acyclic. */
  links: SankeyLink[];
  /** Optional label for the flow value in the tooltip, e.g. "users". */
  valueLabel?: string;
}

export type StatStatus = "success" | "warning" | "danger" | "info";

export interface StatItem {
  /** Metric name, e.g. "Monthly active users". */
  label: string;
  /** The headline figure. Numbers are grouped/formatted; strings shown as-is. */
  value: string | number;
  /** Unit shown after the value, e.g. "ms", "%", "GB". */
  unit?: string;
  /** Signed change vs the comparison period; drives the trend arrow + colour. */
  delta?: number;
  /** Unit for the delta. Defaults to "%". */
  deltaUnit?: string;
  /** Caption beside the delta, e.g. "vs last week". */
  deltaCaption?: string;
  /** Whether a rising value is good (colours the delta). Defaults to true. */
  higherIsBetter?: boolean;
  /** Small caption under the value. */
  description?: string;
  /** Optional semantic accent (left bar) drawn from the theme's semantic set. */
  status?: StatStatus;
  /** Recent values (oldest→newest) rendered as a compact sparkline. */
  trend?: number[];
  /** Goal for the metric; when set (with a numeric value) draws a progress bar. */
  target?: number;
  /** Short status pill shown by the label, coloured by `status`. */
  badge?: string;
}

export interface StatPanelPayload {
  title: string;
  items: StatItem[];
  /** Optional fixed column count (1–4). Defaults to an auto-fit grid. */
  columns?: number;
}

export type DashboardTileType =
  | "bar-chart"
  | "line-chart"
  | "pie-chart"
  | "table"
  | "scatter-chart"
  | "treemap"
  | "heatmap"
  | "stat-panel"
  | "sankey"
  | "map";

export interface DashboardTile {
  /**
   * Which widget to render in this tile. Widened beyond `DashboardTileType` so
   * an unrecognised type stays representable — the dashboard degrades that one
   * tile rather than rejecting the payload — while the union keeps autocomplete
   * on the types that actually render.
   */
  type: DashboardTileType | (string & {});
  /** The referenced widget's own payload (same shape its render_* tool takes). */
  payload: unknown;
  /** How many grid columns this tile spans (1..columns). Defaults to 1. */
  colSpan?: number;
}

export interface DashboardPayload {
  title: string;
  /** Grid column count. Defaults to 2. */
  columns?: number;
  tiles: DashboardTile[];
}

export type ColumnAlign = "left" | "right" | "center";

export type ColumnKind = "text" | "sparkline";

export interface TableColumn {
  key: string;
  label: string;
  align?: ColumnAlign;
  /** Cell rendering mode. Defaults to "text". */
  kind?: ColumnKind;
}

/**
 * Number arrays are legal only in cells under a `kind: "sparkline"` column,
 * ordered oldest → newest (same convention as stat-panel `trend`). Scalars
 * stay legal everywhere — including under sparkline columns, where they
 * render as plain text.
 */
export type TableCell = string | number | number[];
export type TableRow = Record<string, TableCell>;

export interface TablePayload {
  title: string;
  columns: TableColumn[];
  rows: TableRow[];
  sortable: boolean;
  filterable: boolean;
}
