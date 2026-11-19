import { describe, it, expect } from "vitest";
import type { BarSeries } from "../shared/payloads.js";
import {
  categoriesOf,
  percentDomain,
  seriesTotal,
  stackLayout,
} from "../widgets/bar-chart/stack-layout.js";

const s = (name: string, pairs: Array<[string, number]>, extra: Partial<BarSeries> = {}): BarSeries => ({
  name,
  data: pairs.map(([label, value]) => ({ label, value })),
  ...extra,
});

const sum = (xs: (number | undefined)[]) => xs.reduce<number>((a, v) => a + Math.abs(v ?? 0), 0);

describe("stack-layout", () => {
  it("unions categories in first-seen order", () => {
    expect(
      categoriesOf([s("a", [["Q1", 1], ["Q2", 2]]), s("b", [["Q2", 1], ["Q3", 4], ["Q1", 1]])]),
    ).toEqual(["Q1", "Q2", "Q3"]);
  });

  it("leaves a category a series lacks as a gap, not a zero", () => {
    const { rows } = stackLayout([s("a", [["Q1", 1]]), s("b", [["Q2", 2]])], "normal");
    expect(rows[0]!.raw).toEqual([1, undefined]);
    expect(rows[0]!.plot).toEqual([1, undefined]);
  });

  it("grouped and normal stacks plot the raw values", () => {
    const series = [s("a", [["x", 3]]), s("b", [["x", -2]])];
    for (const mode of ["none", "normal"] as const) {
      expect(stackLayout(series, mode).rows[0]!.plot).toEqual([3, -2]);
    }
  });

  it("percent: every category sums to 100%", () => {
    const { rows } = stackLayout(
      [s("a", [["x", 1], ["y", 30]]), s("b", [["x", 3], ["y", 10]]), s("c", [["x", 6], ["y", 60]])],
      "percent",
    );
    for (const r of rows) expect(sum(r.plot)).toBeCloseTo(100, 9);
    expect(rows[0]!.plot).toEqual([10, 30, 60]);
  });

  it("percent: negative parts stay below zero and magnitudes still sum to 100%", () => {
    const { rows } = stackLayout([s("in", [["x", 75]]), s("out", [["x", -25]])], "percent");
    expect(rows[0]!.plot).toEqual([75, -25]);
    expect(sum(rows[0]!.plot)).toBe(100);
    expect(percentDomain(rows)).toEqual([-100, 100]);
  });

  it("normal: negative parts are summed apart from positive ones", () => {
    const { rows } = stackLayout(
      [s("new", [["Jan", 10]]), s("exp", [["Jan", 4]]), s("churn", [["Jan", -6]])],
      "normal",
    );
    expect(rows[0]!.positive).toBe(14);
    expect(rows[0]!.negative).toBe(-6);
  });

  it("percent: an all-zero category plots zeros, not NaN", () => {
    const { rows } = stackLayout([s("a", [["x", 0]]), s("b", [["x", 0]])], "percent");
    expect(rows[0]!.plot).toEqual([0, 0]);
    expect(rows[0]!.plot.every((v) => Number.isFinite(v))).toBe(true);
    expect(percentDomain(rows)).toEqual([0, 100]);
  });

  it("percent: hidden series leave the denominator so the visible stack is 100%", () => {
    const { rows } = stackLayout([s("a", [["x", 1]]), s("b", [["x", 3]])], "percent", new Set([1]));
    expect(rows[0]!.plot).toEqual([100, 0]);
  });

  it("line marks are never normalised and never counted in a stack total", () => {
    const { rows } = stackLayout(
      [s("a", [["x", 2]]), s("b", [["x", 2]]), s("rate", [["x", 42]], { mark: "line" })],
      "percent",
    );
    expect(rows[0]!.plot).toEqual([50, 50, 42]);
    expect(rows[0]!.positive).toBe(4);
  });

  it("totals a series for its legend figure", () => {
    expect(seriesTotal(s("a", [["x", 2], ["y", -5]]))).toBe(-3);
  });
});
