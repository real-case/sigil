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
