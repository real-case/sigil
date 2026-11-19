// Pure layout behind multi-series bars: category union, grouped / stacked /
// percent values, totals. No React, no Recharts — the view hands the rows to
// Recharts through function dataKeys, and these rules are pinned by
// stack-layout.test.ts.
//
// Decisions the composition program left open (item 5), settled here:
// - Categories are the union of every series' labels in first-seen order; a
//   category a series lacks is a gap for it (undefined), not a zero bar.
// - `percent` divides by the category's sum of ABSOLUTE bar values, so the
//   segments' magnitudes add up to 100% and a negative part still goes below
//   zero. A category whose bars are all zero (or all hidden) plots as zeros —
//   no division by zero, no NaN.
// - Line marks are never stacked or normalised: they plot their raw value.
// - Hidden (legend-muted) series drop out of the percent denominator and the
//   totals, so the visible stack still reads as 100%.

import type { BarSeries, BarStack } from "../../shared/payloads.js";

export interface StackRow {
  label: string;
  /** Plotted value per series, by series index (percent mode: 0..100). */
  plot: (number | undefined)[];
  /** The payload's value per series, by series index. */
  raw: (number | undefined)[];
  /** Sum of visible positive bar values in this category. */
  positive: number;
  /** Sum of visible negative bar values in this category (≤ 0). */
  negative: number;
}

export interface StackLayout {
  categories: string[];
  rows: StackRow[];
}

const isBar = (s: Pick<BarSeries, "mark">) => (s.mark ?? "bar") === "bar";

export function categoriesOf(series: readonly Pick<BarSeries, "data">[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of series) {
    for (const d of s.data) {
      if (!seen.has(d.label)) {
        seen.add(d.label);
        out.push(d.label);
      }
    }
  }
  return out;
}

export function stackLayout(
  series: readonly BarSeries[],
  stack: BarStack = "none",
  hidden: ReadonlySet<number> = new Set(),
): StackLayout {
  const categories = categoriesOf(series);
  // Last value wins if a series repeats a label, matching how a Map would read.
  const lookup = series.map((s) => new Map(s.data.map((d) => [d.label, d.value])));

  const rows = categories.map((label): StackRow => {
    const raw = series.map((_, i) => lookup[i]!.get(label));
    let positive = 0;
    let negative = 0;
    let magnitude = 0;
    series.forEach((s, i) => {
      const v = raw[i];
      if (v === undefined || hidden.has(i) || !isBar(s)) return;
      if (v > 0) positive += v;
      else negative += v;
      magnitude += Math.abs(v);
    });
    const plot = raw.map((v, i) => {
      if (v === undefined) return undefined;
      if (stack !== "percent" || !isBar(series[i]!)) return v;
      return magnitude === 0 || hidden.has(i) ? 0 : (v / magnitude) * 100;
    });
    return { label, plot, raw, positive, negative };
  });

  return { categories, rows };
}

/** Value-axis domain for percent mode: 0..100, reaching −100 only if needed. */
export function percentDomain(rows: readonly StackRow[]): [number, number] {
  return [rows.some((r) => r.negative < 0) ? -100 : 0, 100];
}

/** Sum of a series' values (its legend figure). */
export function seriesTotal(s: Pick<BarSeries, "data">): number {
  return s.data.reduce((sum, d) => sum + d.value, 0);
}
