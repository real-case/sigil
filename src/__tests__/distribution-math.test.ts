import { describe, expect, it } from "vitest";
import {
  autoBinCount,
  binEdges,
  boxStats,
  groupBox,
  histogram,
  histogramLayout,
  niceStep,
  quantile,
} from "../widgets/distribution/distribution-math.js";

describe("quantile (type 7, linear interpolation)", () => {
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it("matches NumPy / R defaults", () => {
    expect(quantile(sorted, 0.25)).toBeCloseTo(3.25);
    expect(quantile(sorted, 0.5)).toBeCloseTo(5.5);
    expect(quantile(sorted, 0.75)).toBeCloseTo(7.75);
  });
  it("handles one value and the ends", () => {
    expect(quantile([7], 0.3)).toBe(7);
    expect(quantile(sorted, 0)).toBe(1);
    expect(quantile(sorted, 1)).toBe(10);
  });
});

describe("boxStats", () => {
  it("puts values beyond 1.5 × IQR outside the whiskers, never drops them", () => {
    const s = boxStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])!;
    expect(s.outliers).toEqual([100]);
    expect(s.max).toBe(9);
    expect(s.min).toBe(1);
    expect(s.count).toBe(10);
  });
  it("orders min ≤ q1 ≤ median ≤ q3 ≤ max", () => {
    const s = boxStats([5, 3, 9, 1, 7, 2, 8])!;
    expect(s.min).toBeLessThanOrEqual(s.q1);
    expect(s.q1).toBeLessThanOrEqual(s.median);
    expect(s.median).toBeLessThanOrEqual(s.q3);
    expect(s.q3).toBeLessThanOrEqual(s.max);
    expect(s.median).toBe(5);
  });
  it("ignores non-finite values and answers null for none", () => {
    expect(boxStats([Number.NaN, Infinity])).toBeNull();
    expect(boxStats([2, Number.NaN, 4])!.median).toBe(3);
  });
  it("uses a pre-computed summary as given", () => {
    const b = groupBox({ name: "a", summary: { min: 1, q1: 2, median: 3, q3: 4, max: 5 } })!;
    expect(b).toMatchObject({ min: 1, q1: 2, median: 3, q3: 4, max: 5, outliers: [] });
  });
});

describe("histogram buckets", () => {
  it("niceStep rounds to 1 / 2 / 2.5 / 5 × 10^k", () => {
    expect(niceStep(0.7)).toBe(1);
    expect(niceStep(1.7)).toBe(2);
    expect(niceStep(2.2)).toBe(2.5);
    expect(niceStep(37)).toBe(50);
    expect(niceStep(80)).toBe(100);
  });
  it("edges cover the whole range on round numbers", () => {
    const e = binEdges(3, 97, 10);
    expect(e[0]).toBeLessThanOrEqual(3);
    expect(e[e.length - 1]).toBeGreaterThanOrEqual(97);
    expect(e).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });
  it("counts every value exactly once, the maximum in the last bucket", () => {
    const values = [0, 1, 9.99, 10, 55, 100];
    const bins = histogram(values, [0, 50, 100]);
    expect(bins.map((b) => b.count)).toEqual([4, 2]);
    expect(bins.reduce((n, b) => n + b.count, 0)).toBe(values.length);
  });
  it("auto bin count stays within 5..40", () => {
    expect(autoBinCount([1, 2])).toBeGreaterThanOrEqual(5);
    const many = Array.from({ length: 50_000 }, (_, i) => (i * 7919) % 1000);
    expect(autoBinCount(many)).toBeLessThanOrEqual(40);
  });
  it("gives every raw-value group the same edges and a shared peak", () => {
    const layout = histogramLayout(
      [
        { name: "a", values: [1, 2, 2, 3] },
        { name: "b", values: [8, 9, 9, 9] },
      ],
      4,
    );
    const [a, b] = layout.groups;
    expect(a!.bins.map((x) => x.start)).toEqual(b!.bins.map((x) => x.start));
    expect(layout.peak).toBe(4); // b: 8, 9, 9, 9 all land in [8, 10)
    expect(a!.total).toBe(4);
  });
  it("keeps pre-computed bins as they came", () => {
    const layout = histogramLayout([{ name: "a", bins: [{ start: -10, end: 0, count: 2 }, { start: 0, end: 10, count: 5 }] }]);
    expect(layout.min).toBe(-10);
    expect(layout.max).toBe(10);
    expect(layout.groups[0]!.total).toBe(7);
  });
});
