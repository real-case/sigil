// Pure data shaping behind the line chart's comparison baseline and
// incomplete-period tail, kept free of React and Recharts so it can be pinned
// by unit tests.
//
// Rows keep each series' value under its own name (`row[name]`), exactly as
// before, so a payload without `compare` / `partialFrom` produces the same rows
// it always did. Baselines and incomplete tails live in two side maps on the
// row (`row.__cmp`, `row.__part`) that the view reads through function
// dataKeys — a series name may contain any character, and Recharts would read
// a dotted string dataKey as a property path.

import type { LineSeries } from "../../shared/payloads.js";
import { fmtNumber, fmtShare } from "../shared/chart-text.js";

export type XValue = string | number;

export type LineRow = { x: XValue } & Record<string, unknown> & {
    __cmp?: Record<string, number>;
    __part?: Record<string, number>;
  };

export function isAllNumeric(series: readonly LineSeries[]): boolean {
  return series.every(
    (s) =>
      s.data.every((d) => typeof d.x === "number") &&
      (s.compare?.data.every((d) => typeof d.x === "number") ?? true),
  );
}

/**
 * Union every series' points (and every baseline's) by x. Category x values
 * keep first-seen order; an all-numeric axis is sorted.
 */
export function mergeSeries(series: readonly LineSeries[]): LineRow[] {
  const byX = new Map<XValue, LineRow>();
  const rowAt = (x: XValue): LineRow => {
    let row = byX.get(x);
    if (!row) {
      row = { x };
      byX.set(x, row);
    }
    return row;
  };
  for (const s of series) {
    for (const { x, y } of s.data) rowAt(x)[s.name] = y;
  }
  // Baselines second, so a baseline x the series lacks lands after the
  // series' own categories instead of interleaving into them.
  for (const s of series) {
    if (!s.compare) continue;
    for (const { x, y } of s.compare.data) {
      const row = rowAt(x);
      row.__cmp = { ...row.__cmp, [s.name]: y };
    }
  }
  const rows = Array.from(byX.values());
  if (series.length > 0 && isAllNumeric(series)) {
    rows.sort((a, b) => (a.x as number) - (b.x as number));
  }
  return rows;
}

/**
 * Index of the first row that is part of the incomplete period: the row whose
 * x equals `partialFrom`, or — on a numeric axis — the first row at or past
 * it. -1 when there is none (or no `partialFrom`), which disables the split.
 */
export function partialStartIndex(
  rows: readonly LineRow[],
  partialFrom: XValue | undefined,
  numeric: boolean,
): number {
  if (partialFrom === undefined) return -1;
  const exact = rows.findIndex((r) => r.x === partialFrom);
  if (exact >= 0 || !numeric || typeof partialFrom !== "number") return exact;
  return rows.findIndex((r) => (r.x as number) >= partialFrom);
}

/**
 * Move every value at or after `start` into the row's `__part` map, and keep
 * the value at `start - 1` in both places so the dashed tail joins the solid
 * line instead of leaving a gap. Returns new rows; the input is not touched.
 */
export function splitPartial(
  rows: readonly LineRow[],
  names: readonly string[],
  start: number,
): LineRow[] {
  if (start < 0) return rows.map((r) => ({ ...r }));
  return rows.map((row, i) => {
    const next: LineRow = { ...row };
    if (i < start - 1) return next;
    const part: Record<string, number> = { ...row.__part };
    for (const name of names) {
      const v = row[name];
      if (typeof v !== "number") continue;
      part[name] = v;
      if (i >= start) delete next[name];
    }
    next.__part = part;
    return next;
  });
}

/** A series' value in a row, wherever the split put it. */
export function valueAt(row: LineRow, name: string): number | undefined {
  const v = row[name];
  if (typeof v === "number") return v;
  return row.__part?.[name];
}

export interface Delta {
  abs: number;
  /** Relative change as a fraction; null when the base is 0. */
  pct: number | null;
}

export function compareDelta(value: number, base: number): Delta {
  const abs = value - base;
  return { abs, pct: base === 0 ? null : abs / Math.abs(base) };
}

/** Prefix an unsigned magnitude with the sign of `n` (a true minus sign). */
const signed = (n: number, magnitude: string) =>
  n > 0 ? `+${magnitude}` : n < 0 ? `−${magnitude}` : magnitude;

/** "+1,240 (+12.4%)", "−80 (−3%)", or "+5" when the base was 0. */
export function fmtDelta({ abs, pct }: Delta): string {
  const absText = signed(abs, fmtNumber(Math.abs(abs)));
  if (pct === null) return absText;
  return `${absText} (${signed(pct, fmtShare(Math.abs(pct)))})`;
}

/** "+12.4%" alone, for the header caption; "" when the base was 0. */
export function fmtDeltaPct({ pct }: Delta): string {
  return pct === null ? "" : signed(pct, fmtShare(Math.abs(pct)));
}
