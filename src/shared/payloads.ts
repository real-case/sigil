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

export type ColumnAlign = "left" | "right" | "center";

export interface TableColumn {
  key: string;
  label: string;
  align?: ColumnAlign;
}

export type TableCell = string | number;
export type TableRow = Record<string, TableCell>;

export interface TablePayload {
  title: string;
  columns: TableColumn[];
  rows: TableRow[];
  sortable: boolean;
  filterable: boolean;
}
