// Statistics behind render_distribution (plan task 4.4, program item 14).
//
// Kept pure and separate from the view so each number on screen has a unit
// test: quartiles, whiskers, outliers and bucket edges.
//
// - Quartiles use linear interpolation between order statistics (Hyndman–Fan
//   type 7, the default of R, NumPy and Excel's QUARTILE.INC), so a model that
//   computed them in SQL or pandas gets the same box here.
// - Whiskers are Tukey's: the most extreme values within 1.5 × IQR of the box.
//   Anything beyond is an outlier and drawn as a dot, never silently clipped.
// - Histogram edges are "nice" (1, 2, 2.5 or 5 × 10^k) and shared by every
//   group, so stacked histograms line up bucket for bucket.

import type { BoxSummary, DistributionGroup, HistogramBin } from "../../shared/payloads.js";

export function quantile(sorted: readonly number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  if (n === 1) return sorted[0]!;
  const h = (n - 1) * Math.max(0, Math.min(1, p));
  const lo = Math.floor(h);
  const hi = Math.min(n - 1, lo + 1);
  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!);
}

export interface BoxStats {
  /** Whisker ends. */
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  mean?: number;
  count?: number;
  outliers: number[];
}

const finite = (values: readonly number[]) => values.filter((v) => Number.isFinite(v));

/** Five-number summary with Tukey whiskers from raw values. */
export function boxStats(values: readonly number[]): BoxStats | null {
  const sorted = finite(values).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const loFence = q1 - 1.5 * iqr;
  const hiFence = q3 + 1.5 * iqr;
  const inside = sorted.filter((v) => v >= loFence && v <= hiFence);
  const outliers = sorted.filter((v) => v < loFence || v > hiFence);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    min: inside[0] ?? q1,
    max: inside[inside.length - 1] ?? q3,
    q1,
    median,
    q3,
    mean,
    count: sorted.length,
    outliers,
  };
}

/** The box for a group: computed from `values` when present, else its summary. */
export function groupBox(group: DistributionGroup): BoxStats | null {
  if (group.values) return boxStats(group.values);
  const s: BoxSummary | undefined = group.summary;
  if (!s) return null;
  return { ...s, outliers: s.outliers ? [...s.outliers] : [] };
}

/** A round step near `raw`: 1, 2, 2.5 or 5 × 10^k. */
export function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  const f = raw / base;
  const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return m * base;
}

export const MIN_AUTO_BINS = 5;
export const MAX_AUTO_BINS = 40;

/**
 * Bucket count for raw values: Freedman–Diaconis (width 2·IQR·n^−⅓), which
 * resists outliers better than Sturges, clamped to 5..40 so a tiny sample
 * still has a shape and a huge one stays readable.
 */
export function autoBinCount(values: readonly number[]): number {
  const sorted = finite(values).sort((a, b) => a - b);
  const n = sorted.length;
  if (n < 2) return MIN_AUTO_BINS;
  const range = sorted[n - 1]! - sorted[0]!;
  if (range === 0) return 1;
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const width = 2 * iqr * n ** (-1 / 3);
  const count = width > 0 ? Math.ceil(range / width) : Math.ceil(Math.log2(n) + 1);
  return Math.max(MIN_AUTO_BINS, Math.min(MAX_AUTO_BINS, count));
}

/** Nice shared edges covering [min, max] in roughly `count` buckets. */
export function binEdges(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max === min) {
    const step = niceStep(Math.abs(min) / 10 || 1);
    return [min - step / 2, min + step / 2];
  }
  const step = niceStep((max - min) / Math.max(1, count));
  const start = Math.floor(min / step) * step;
  const edges: number[] = [];
  for (let e = start; edges.length < 500; e += step) {
    // Rounded to the step's precision so 0.1 + 0.2 does not leak into labels.
    edges.push(Number(e.toPrecision(12)));
    if (e > max) break;
  }
  if (edges.length < 2) edges.push(start + step);
  return edges;
}

/** Count `values` into the buckets between consecutive `edges`; the last bucket is closed. */
export function histogram(values: readonly number[], edges: readonly number[]): HistogramBin[] {
  const bins: HistogramBin[] = [];
  for (let i = 0; i + 1 < edges.length; i++) bins.push({ start: edges[i]!, end: edges[i + 1]!, count: 0 });
  if (bins.length === 0) return bins;
  const first = edges[0]!;
  const step = edges[1]! - first;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    let i = Math.floor((v - first) / step);
    if (i === bins.length && v <= edges[edges.length - 1]!) i -= 1;
    const bin = bins[i];
    if (bin) bin.count += 1;
  }
  return bins;
}

export interface HistogramLayout {
  /** Per group, in payload order. */
  groups: { name: string; bins: HistogramBin[]; total: number; median?: number }[];
  /** Value-axis extent shared by every group. */
  min: number;
  max: number;
  /** Tallest bucket over every group, so heights compare. */
  peak: number;
}

/**
 * Histograms for every group on one axis. Raw-value groups share edges built
 * from the pooled range; pre-binned groups keep the edges they came with.
 */
export function histogramLayout(groups: readonly DistributionGroup[], binCount?: number): HistogramLayout {
  const pooled = groups.flatMap((g) => (g.values ? finite(g.values) : []));
  let min = Infinity;
  let max = -Infinity;
  for (const v of pooled) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const edges =
    pooled.length > 0 ? binEdges(min, max, binCount ?? autoBinCount(pooled)) : [];
  const out = groups.map((g) => {
    if (g.values) {
      const vals = finite(g.values);
      const sorted = [...vals].sort((a, b) => a - b);
      return { name: g.name, bins: histogram(vals, edges), total: vals.length, median: quantile(sorted, 0.5) };
    }
    const bins = (g.bins ?? []).map((b) => ({ ...b }));
    return { name: g.name, bins, total: bins.reduce((a, b) => a + b.count, 0) };
  });
  let lo = Infinity;
  let hi = -Infinity;
  let peak = 0;
  for (const g of out) {
    for (const b of g.bins) {
      lo = Math.min(lo, b.start);
      hi = Math.max(hi, b.end);
      peak = Math.max(peak, b.count);
    }
  }
  if (!Number.isFinite(lo)) {
    lo = 0;
    hi = 1;
  }
  return { groups: out, min: lo, max: hi, peak };
}

/** Round ticks across [min, max]. */
export function linearTicks(min: number, max: number, approx = 5): number[] {
  if (!(max > min)) return [min];
  const step = niceStep((max - min) / approx);
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) {
    ticks.push(Number(t.toPrecision(12)));
  }
  return ticks;
}
