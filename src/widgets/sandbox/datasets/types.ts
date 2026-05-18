// Category labels used across every widget's preset list. The point of the
// taxonomy is to make visual regressions reproducible: each category targets
// a specific failure mode (overflowing labels, dense ticks, sign flips, etc).
//
// Thresholds below are deliberate — they bracket the heuristic boundaries in
// widget rendering code (e.g. BarChartView's ROTATE_AFTER_ITEMS=6). Tweak if
// you want different scenarios surfaced.

export type DatasetCategory =
  | "minimal"
  | "small"
  | "medium"
  | "large"
  | "edgeLabels"
  | "negatives"
  | "multiSeries"
  | "nested";

export const CATEGORY_ORDER: readonly DatasetCategory[] = [
  "minimal",
  "small",
  "medium",
  "large",
  "edgeLabels",
  "negatives",
  "multiSeries",
  "nested",
] as const;

// Point counts associated with each size category. Used by procedural
// generators (line/scatter/heatmap) so sizes scale predictably across
// widgets.
export const CATEGORY_COUNT: Record<"minimal" | "small" | "medium" | "large", number> = {
  minimal: 1,
  small: 5,
  medium: 20,
  large: 120,
};

export interface Dataset<P> {
  id: string;
  label: string;
  category: DatasetCategory;
  payload: P;
}
