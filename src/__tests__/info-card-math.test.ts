// The rules render_info_card prints as text — scale, off-scale flag, status —
// pinned here rather than read off a render.

import { describe, it, expect } from "vitest";
import {
  bandRanges,
  changeOf,
  niceCeil,
  ofTarget,
  place,
  rankMove,
  scaleOf,
  statusOf,
} from "../widgets/info-card/info-card-math.js";

describe("scaleOf", () => {
  it("derives a round ceiling above every mark, so nothing is off-scale by default", () => {
    expect(scaleOf({ value: 840, target: 1000 })).toEqual({ min: 0, max: 1000 });
    expect(scaleOf({ value: 1240, target: 1000 })).toEqual({ min: 0, max: 2000 });
    expect(scaleOf({ value: 3, bands: [4, 7] })).toEqual({ min: 0, max: 10 });
    expect(scaleOf({ value: 1, thresholds: { warn: 75, critical: 90 } })).toEqual({ min: 0, max: 100 });
  });

  it("puts a percentage on 0..100 when it fits", () => {
    expect(scaleOf({ value: 37, unit: "%" })).toEqual({ min: 0, max: 100 });
    expect(scaleOf({ value: 112, unit: "%" }).max).toBeGreaterThanOrEqual(112);
  });

  it("starts below zero only when a value does", () => {
    expect(scaleOf({ value: -20, target: 10 }).min).toBe(-20);
  });

  it("honours an explicit min and max", () => {
    expect(scaleOf({ value: 99.95, min: 99, max: 100 })).toEqual({ min: 99, max: 100 });
  });

  it("never returns an empty scale", () => {
    expect(scaleOf({ value: 0 })).toEqual({ min: 0, max: 1 });
  });
});

describe("place", () => {
  const scale = { min: 0, max: 120 };

  it("positions a value inside the scale", () => {
    expect(place(60, scale)).toEqual({ pos: 0.5, off: null });
  });

  it("pins a value above the scale to the right edge and flags it", () => {
    expect(place(135, scale)).toEqual({ pos: 1, off: "above" });
  });

  it("pins a value below the scale to the left edge and flags it", () => {
    expect(place(-12, scale)).toEqual({ pos: 0, off: "below" });
  });

  it("treats the edges themselves as on the scale", () => {
    expect(place(120, scale).off).toBeNull();
    expect(place(0, scale).off).toBeNull();
  });
});

describe("statusOf", () => {
  it("reads thresholds as 'lower is worse' by default", () => {
    const t = { thresholds: { warn: 99.9, critical: 99.5 } };
    expect(statusOf({ ...t, value: 99.95 })).toEqual({ tone: "success", text: "OK" });
    expect(statusOf({ ...t, value: 99.7 })).toEqual({ tone: "warning", text: "Warning" });
    expect(statusOf({ ...t, value: 99.1 })).toEqual({ tone: "danger", text: "Critical" });
  });

  it("flips thresholds when lower is better", () => {
    const t = { thresholds: { warn: 300, critical: 600 }, higherIsBetter: false };
    expect(statusOf({ ...t, value: 210 })?.text).toBe("OK");
    expect(statusOf({ ...t, value: 412 })?.text).toBe("Warning");
    expect(statusOf({ ...t, value: 640 })?.text).toBe("Critical");
  });

  it("counts a value exactly at a threshold as past it", () => {
    expect(statusOf({ value: 90, thresholds: { warn: 75, critical: 90 }, higherIsBetter: false })?.text).toBe(
      "Critical",
    );
  });

  it("falls back to the target", () => {
    expect(statusOf({ value: 412, target: 380 })).toEqual({ tone: "success", text: "On target" });
    expect(statusOf({ value: 8.4, target: 9 })).toEqual({ tone: "warning", text: "Below target" });
    expect(statusOf({ value: 148, target: 120, higherIsBetter: false })?.text).toBe("Above target");
  });

  it("has no status without thresholds or target", () => {
    expect(statusOf({ value: 1 })).toBeNull();
  });
});

describe("helpers", () => {
  it("rounds up to 1, 2, 2.5 or 5 × 10^k", () => {
    expect([0.7, 1, 1.2, 2.2, 3, 7, 12, 1240].map(niceCeil)).toEqual([1, 1, 2, 2.5, 5, 10, 20, 2000]);
  });

  it("divides by the target only when there is one", () => {
    expect(ofTarget(84, 100)).toBe(0.84);
    expect(ofTarget(84, 0)).toBeNull();
    expect(ofTarget(84, undefined)).toBeNull();
  });

  it("splits the scale at the bullet bands, ignoring ones outside it", () => {
    expect(bandRanges([60, 80, 140], { min: 0, max: 100 })).toEqual([
      [0, 60],
      [60, 80],
      [80, 100],
    ]);
    expect(bandRanges(undefined, { min: 0, max: 10 })).toEqual([[0, 10]]);
  });

  it("colours a change by whether it is good", () => {
    expect(changeOf(48_200, 39_800)).toMatchObject({ delta: 8400, tone: "success" });
    expect(changeOf(1.8, 2.3, false).tone).toBe("success");
    expect(changeOf(3.1, 3.4).tone).toBe("danger");
    expect(changeOf(5, 5).tone).toBeNull();
    expect(changeOf(5, 0).ratio).toBeNull();
  });

  it("shows a rank move only when there is one to show", () => {
    expect(rankMove(3)).toEqual({ glyph: "▲", text: "up 3" });
    expect(rankMove(-2)).toEqual({ glyph: "▼", text: "down 2" });
    expect(rankMove(0)).toEqual({ glyph: "–", text: "unchanged" });
    expect(rankMove(undefined)).toBeNull();
  });
});
