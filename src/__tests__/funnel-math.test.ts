// The two conversions a funnel prints are the whole point of the widget, so
// they are pinned here rather than read off a render.

import { describe, it, expect } from "vitest";
import { fmtConversion, funnelLayout } from "../widgets/funnel/funnel-math.js";

const steps = (...values: number[]) => values.map((value, i) => ({ label: `s${i}`, value }));

describe("funnelLayout", () => {
  it("computes conversion from the first and from the previous stage", () => {
    const { rows } = funnelLayout(steps(1000, 400, 100));
    expect(rows.map((r) => r.ofFirst)).toEqual([1, 0.4, 0.1]);
    expect(rows.map((r) => r.ofPrevious)).toEqual([null, 0.4, 0.25]);
    expect(rows.map((r) => r.lost)).toEqual([0, 600, 300]);
  });

  it("points at the worst step conversion, not the largest absolute loss", () => {
    // 1000 → 500 loses 500 people at 50 %; 500 → 50 loses 450 at 10 %.
    expect(funnelLayout(steps(1000, 500, 50)).biggestDrop).toBe(2);
  });

  it("breaks a tie toward the earlier stage, where the leak starts", () => {
    expect(funnelLayout(steps(100, 50, 25)).biggestDrop).toBe(1);
  });

  it("reports no drop when nothing was lost", () => {
    expect(funnelLayout(steps(10, 10, 10)).biggestDrop).toBe(-1);
    expect(funnelLayout(steps(5)).biggestDrop).toBe(-1);
  });

  it("survives a zero stage: null ratios, never NaN or Infinity", () => {
    const { rows } = funnelLayout(steps(100, 0, 0));
    expect(rows[1]!.ofPrevious).toBe(0);
    expect(rows[2]!.ofPrevious).toBeNull();
    expect(rows[2]!.ofFirst).toBe(0);
    for (const r of rows) {
      for (const v of [r.ofFirst, r.ofPrevious, r.lost]) {
        if (v !== null) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("has no conversions at all when the first stage is zero", () => {
    const { rows, max } = funnelLayout(steps(0, 0));
    expect(rows.map((r) => r.ofFirst)).toEqual([null, null]);
    expect(max).toBe(0);
  });

  it("flags a stage larger than the previous one and keeps its real value", () => {
    const { rows, max } = funnelLayout(steps(100, 60, 80));
    expect(rows[2]).toMatchObject({ value: 80, grew: true, lost: 0 });
    expect(rows[2]!.ofPrevious).toBeCloseTo(80 / 60);
    expect(rows[1]!.grew).toBe(false);
    expect(max).toBe(100);
  });

  it("scales bars to the largest stage, even when a later one is the largest", () => {
    expect(funnelLayout(steps(50, 120)).max).toBe(120);
  });
});

describe("fmtConversion", () => {
  it("prints one decimal, whole numbers at the ends, and a dash for no ratio", () => {
    expect(fmtConversion(0.4123)).toBe("41.2%");
    expect(fmtConversion(1)).toBe("100%");
    expect(fmtConversion(0)).toBe("0%");
    expect(fmtConversion(1.3333)).toBe("133%");
    expect(fmtConversion(null)).toBe("—");
  });
});
