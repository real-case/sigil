// Pure, kind-aware cell helpers for the table widget. Node-testable — no DOM,
// no React. The sparkline geometry it once carried now lives in
// `shared/sparkline-geometry.ts`; `sparkPoints` stays as the table's thin
// wrapper over it, keeping this module's callers and tests unchanged.

import type { ColumnKind, TableCell } from "../../shared/payloads.js";
import { sparkPolyline, type SparkBox } from "../shared/sparkline-geometry.js";

export const SPARK_WIDTH = 56;
export const SPARK_HEIGHT = 16;

// Asymmetric inset: 2px horizontal keeps the single-value dot (r=1.5) inside
// the viewport; 1px vertical is enough for the 1px stroke — a symmetric 2px
// pad would spend a quarter of the 16px box on padding.
export const SPARK_PAD_X = 2;
export const SPARK_PAD_Y = 1;

/**
 * The table's box: an asymmetric inset, because 2px horizontal keeps the
 * single-value dot (r=1.5) inside the viewport while 1px vertical is enough
 * for the 1px stroke — a symmetric 2px pad would spend a quarter of the 16px
 * height on padding. A flat series draws at the midline, so "no change" looks
 * like no change.
 */
const box = (width: number, height: number): SparkBox => ({
  width,
  height,
  padX: SPARK_PAD_X,
  padY: SPARK_PAD_Y,
  flat: "middle",
});

/**
 * Map a numeric series (oldest → newest) onto an SVG polyline `points` string
 * inside a `width`×`height` box. Fewer than 2 values yields an empty string
 * (a single value renders as a dot, not a line).
 */
export function sparkPoints(
  values: readonly number[],
  width: number = SPARK_WIDTH,
  height: number = SPARK_HEIGHT,
): string {
  return sparkPolyline(values, box(width, height));
}

/**
 * Sort key for a cell. Sparkline arrays sort by their last (newest) value;
 * an empty array sorts like an empty cell. Scalars pass through under any
 * kind — a scalar under a sparkline column sorts by its own value, consistent
 * with rendering it as plain text.
 */
export function cellSortValue(
  cell: TableCell | undefined,
  kind: ColumnKind,
): string | number | undefined {
  if (Array.isArray(cell)) {
    if (kind === "sparkline") {
      return cell.length > 0 ? cell[cell.length - 1] : undefined;
    }
    // Malformed (array under a text column, reachable only via raw dashboard
    // payloads): sort like its rendered text.
    return String(cell);
  }
  return cell;
}

/**
 * Filter-haystack contribution of a cell. Sparkline arrays contribute
 * nothing — their digits are invisible in the rendered table, so filter terms
 * must not match them. Scalars stringify as before.
 */
export function cellFilterText(cell: TableCell | undefined, kind: ColumnKind): string {
  if (Array.isArray(cell) && kind === "sparkline") return "";
  return String(cell);
}

/**
 * CSV export value of a cell. Sparkline arrays export as one joined
 * `"1,2,3"` cell (quoting and the formula-injection guard are applied
 * downstream by `csvField`). Scalars pass through; a missing cell exports
 * as an empty field.
 */
export function cellCsvValue(cell: TableCell | undefined, kind: ColumnKind): string | number {
  if (cell === undefined) return "";
  if (Array.isArray(cell)) {
    return kind === "sparkline" ? cell.join(",") : String(cell);
  }
  return cell;
}
