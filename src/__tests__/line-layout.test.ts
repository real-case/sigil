import { describe, it, expect } from "vitest";
import type { LineSeries } from "../shared/payloads.js";
import {
  compareDelta,
  fmtDelta,
  fmtDeltaPct,
  mergeSeries,
  partialStartIndex,
  splitPartial,
  valueAt,
} from "../widgets/line-chart/line-layout.js";

const pts = (pairs: Array<[string | number, number]>) => pairs.map(([x, y]) => ({ x, y }));

describe("line-layout: compare baseline", () => {
  it("merges a baseline by x into a side map, leaving series keys as before", () => {
    const series: LineSeries[] = [
      { name: "rev", data: pts([["a", 1], ["b", 2]]), compare: { data: pts([["a", 10], ["b", 20]]) } },
    ];
    const rows = mergeSeries(series);
    expect(rows).toEqual([
      { x: "a", rev: 1, __cmp: { rev: 10 } },
      { x: "b", rev: 2, __cmp: { rev: 20 } },
    ]);
  });

  it("a series without compare merges exactly as it always did", () => {
    expect(mergeSeries([{ name: "s", data: pts([[2, 5], [1, 4]]) }])).toEqual([
      { x: 1, s: 4 },
      { x: 2, s: 5 },
    ]);
  });

  it("computes the change in absolute and relative terms", () => {
    expect(compareDelta(110, 100)).toEqual({ abs: 10, pct: 0.1 });
    expect(compareDelta(-5, -10)).toEqual({ abs: 5, pct: 0.5 });
    expect(compareDelta(5, 0)).toEqual({ abs: 5, pct: null });
  });

  it("formats the delta with a sign on both parts", () => {
    expect(fmtDelta(compareDelta(11_240, 10_000))).toBe("+1,240 (+12.4%)");
    expect(fmtDelta(compareDelta(97, 100))).toBe("−3 (−3.0%)");
    expect(fmtDelta(compareDelta(5, 0))).toBe("+5");
    expect(fmtDeltaPct(compareDelta(5, 0))).toBe("");
  });
});

describe("line-layout: incomplete period", () => {
  const rows = mergeSeries([{ name: "s", data: pts([[1, 1], [2, 2], [3, 3], [4, 4]]) }]);

  it("finds the first incomplete row by value, or the first row past it on a numeric axis", () => {
    expect(partialStartIndex(rows, 3, true)).toBe(2);
    expect(partialStartIndex(rows, 2.5, true)).toBe(2);
    expect(partialStartIndex(rows, 9, true)).toBe(-1);
    expect(partialStartIndex(rows, undefined, true)).toBe(-1);
    const cats = mergeSeries([{ name: "s", data: pts([["Jan", 1], ["Feb", 2]]) }]);
    expect(partialStartIndex(cats, "Feb", false)).toBe(1);
    expect(partialStartIndex(cats, "Mar", false)).toBe(-1);
  });

  it("moves the tail aside and shares the joining point, without touching the input", () => {
    const split = splitPartial(rows, ["s"], 2);
    expect(split.map((r) => r["s"])).toEqual([1, 2, undefined, undefined]);
    expect(split.map((r) => r.__part?.["s"])).toEqual([undefined, 2, 3, 4]);
    expect(split.map((r) => valueAt(r, "s"))).toEqual([1, 2, 3, 4]);
    expect(rows.map((r) => r["s"])).toEqual([1, 2, 3, 4]);
  });

  it("is a plain copy when there is no incomplete period", () => {
    expect(splitPartial(rows, ["s"], -1)).toEqual(rows);
  });
});
