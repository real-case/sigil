// Pure, kind-aware cell helpers for the table widget. Node-testable — no DOM,
// no React. `sparkPoints` is geometry-only so a future shared-sparkline
// consolidation can lift it without touching the table.

import type { ColumnKind, TableCell } from "../../shared/payloads.js";

export const SPARK_WIDTH = 56;
export const SPARK_HEIGHT = 16;

// Asymmetric inset: 2px horizontal keeps the single-value dot (r=1.5) inside
// the viewport; 1px vertical is enough for the 1px stroke — a symmetric 2px
// pad would spend a quarter of the 16px box on padding.
export const SPARK_PAD_X = 2;
export const SPARK_PAD_Y = 1;

/**
 * Map a numeric series (oldest → newest) onto an SVG polyline `points` string
 * inside a `width`×`height` box. Min/max normalized, y inverted so the max is
 * up; a constant series draws at the vertical midline. Coordinates carry fixed
 * two-decimal precision so the output is stable across engines. Fewer than 2
 * values yields an empty string (a single value renders as a dot, not a line).
 */
export function sparkPoints(
  values: readonly number[],
  width: number = SPARK_WIDTH,
  height: number = SPARK_HEIGHT,
): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const n = values.length;
  const x = (i: number) => SPARK_PAD_X + (i / (n - 1)) * (width - SPARK_PAD_X * 2);
  const y = (v: number) =>
    range === 0
      ? height / 2
      : SPARK_PAD_Y + (1 - (v - min) / range) * (height - SPARK_PAD_Y * 2);
  return values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
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
