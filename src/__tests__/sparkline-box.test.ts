// The shared geometry module's own contract, at both consumers' dimensions.
// sparkline-geometry.test.tsx proves the two call sites still draw what they
// drew; this covers the cases neither of them can reach through a render.

import { describe, it, expect } from "vitest";
import {
  sparkPoints,
  sparkPolyline,
  type SparkBox,
} from "../widgets/shared/sparkline-geometry.js";

const TABLE: SparkBox = { width: 56, height: 16, padX: 2, padY: 1, flat: "middle" };
const CARD: SparkBox = { width: 100, height: 28, padX: 2, padY: 2, flat: "floor" };

describe("degenerate series", () => {
  it("declines to draw fewer than two points", () => {
    // 0/0 lives in the `i / (n - 1)` term, so a single value would emit NaN
    // coordinates rather than nothing. The stat panel is saved from that today
    // only by its caller's `trend.length > 1` check.
    for (const box of [TABLE, CARD]) {
      expect(sparkPoints([], box)).toEqual([]);
      expect(sparkPoints([7], box)).toEqual([]);
      expect(sparkPolyline([7], box)).toBe("");
    }
  });
});

describe("a series with no range", () => {
  it("sits on the midline under flat: middle", () => {
    expect(sparkPoints([3, 3], TABLE).map((p) => p.y)).toEqual(["8.00", "8.00"]);
  });

  it("sits on the bottom inset under flat: floor", () => {
    // height - padY. Reproduces what `range = max - min || 1` computed.
    expect(sparkPoints([3, 3], CARD).map((p) => p.y)).toEqual(["26.00", "26.00"]);
  });

  it("treats an all-zero series the same as any other flat one", () => {
    expect(sparkPoints([0, 0, 0], TABLE).map((p) => p.y)).toEqual(["8.00", "8.00", "8.00"]);
  });
});

describe("normalisation", () => {
  it("puts the maximum at the top inset and the minimum at the bottom", () => {
    const pts = sparkPoints([1, 5], CARD);
    expect(pts.map((p) => p.y)).toEqual(["26.00", "2.00"]);
  });

  it("spans the full inset width regardless of length", () => {
    for (const n of [2, 3, 9]) {
      const pts = sparkPoints(Array.from({ length: n }, (_, i) => i), TABLE);
      expect(pts[0]!.x).toBe("2.00");
      expect(pts[pts.length - 1]!.x).toBe("54.00");
    }
  });

  it("is unaffected by an offset applied to every value", () => {
    const a = sparkPoints([1, 4, 2], CARD);
    const b = sparkPoints([1001, 1004, 1002], CARD);
    expect(a).toEqual(b);
  });
});
