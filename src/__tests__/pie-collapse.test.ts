import { describe, it, expect } from "vitest";
import { collapsePieData, normalizeMaxSegments } from "../widgets/pie-chart/collapse.js";
import type { PieDatum } from "../shared/payloads.js";

const slices = (...values: number[]): PieDatum[] =>
  values.map((value, i) => ({ label: `s${i}`, value }));

describe("collapsePieData", () => {
  describe("collapse rule", () => {
    it("collapses 12 slices to top-4 + Other under the default cap", () => {
      const data = slices(120, 110, 100, 90, 50, 40, 30, 20, 10, 5, 3, 2);
      const { display, isCollapsed } = collapsePieData(data);

      expect(isCollapsed).toBe(true);
      expect(display).toHaveLength(5);
      expect(display.slice(0, 4).map((d) => d.origIndex)).toEqual([0, 1, 2, 3]);

      const other = display[4]!;
      expect(other.label).toBe("Other");
      expect(other.isOther).toBe(true);
      expect(other.origIndex).toBe(-1);
      expect(other.otherCount).toBe(8);
      expect(other.value).toBe(50 + 40 + 30 + 20 + 10 + 5 + 3 + 2);
    });

    it("keeps the top slices in original payload order, not value order", () => {
      const data = slices(10, 1, 9, 2, 8, 3, 7);
      const { display } = collapsePieData(data);

      // Top-4 by value are indices 0, 2, 4, 6 — rendered in payload order.
      expect(display.slice(0, 4).map((d) => d.origIndex)).toEqual([0, 2, 4, 6]);
      expect(display[4]!.value).toBe(1 + 2 + 3);
    });

    it("mirrors the input when N equals the cap", () => {
      const data = slices(5, 4, 3, 2, 1);
      const { display, isCollapsed } = collapsePieData(data);

      expect(isCollapsed).toBe(false);
      expect(display).toHaveLength(5);
      expect(display.map((d) => d.origIndex)).toEqual([0, 1, 2, 3, 4]);
      expect(display.every((d) => !d.isOther)).toBe(true);
    });

    it("mirrors the input when N is below the cap", () => {
      const data = slices(2, 1);
      const { display, isCollapsed } = collapsePieData(data);

      expect(isCollapsed).toBe(false);
      expect(display.map((d) => d.origIndex)).toEqual([0, 1]);
    });

    it("resolves boundary ties stably by original index", () => {
      const data = slices(5, 3, 3, 3, 3, 3);
      const { display } = collapsePieData(data);

      // Four keep slots; the tied 3s keep the earliest payload entries.
      expect(display.slice(0, 4).map((d) => d.origIndex)).toEqual([0, 1, 2, 3]);
      expect(display[4]!.otherCount).toBe(2);
      expect(display[4]!.value).toBe(6);
    });

    it("keeps a zero-sum tail as-is on the Other slice", () => {
      const data = slices(10, 9, 8, 7, 0, 0, 0);
      const { display } = collapsePieData(data);

      expect(display[4]!.isOther).toBe(true);
      expect(display[4]!.value).toBe(0);
      expect(display[4]!.otherCount).toBe(3);
    });

    it("keeps a negative-sum tail as-is on the Other slice", () => {
      const data = slices(10, 9, 8, 7, -2, -3);
      const { display } = collapsePieData(data);

      expect(display[4]!.isOther).toBe(true);
      expect(display[4]!.value).toBe(-5);
      expect(display[4]!.otherCount).toBe(2);
    });

    it("does not mutate the input array or its entries", () => {
      const data = slices(6, 5, 4, 3, 2, 1);
      Object.freeze(data);
      data.forEach((d) => Object.freeze(d));
      const snapshot = JSON.stringify(data);

      const { display } = collapsePieData(data);

      expect(JSON.stringify(data)).toBe(snapshot);
      expect(display[0]).not.toBe(data[0]);
    });
  });

  describe("maxSegments override", () => {
    it("maxSegments 2 keeps only the top slice plus Other", () => {
      const data = slices(1, 10, 2, 3);
      const { display } = collapsePieData(data, 2);

      expect(display).toHaveLength(2);
      expect(display[0]!.origIndex).toBe(1);
      expect(display[1]!.isOther).toBe(true);
      expect(display[1]!.value).toBe(1 + 2 + 3);
      expect(display[1]!.otherCount).toBe(3);
    });

    it("maxSegments >= data.length disables collapsing", () => {
      const data = slices(8, 7, 6, 5, 4, 3, 2, 1);
      const { display, isCollapsed } = collapsePieData(data, 8);

      expect(isCollapsed).toBe(false);
      expect(display).toHaveLength(8);
    });

    it("omitted maxSegments defaults to 5", () => {
      const data = slices(6, 5, 4, 3, 2, 1);
      const { display, isCollapsed } = collapsePieData(data);

      expect(isCollapsed).toBe(true);
      expect(display).toHaveLength(5);
      expect(display[4]!.otherCount).toBe(2);
    });

    it("normalizes out-of-range values via the shared clamp", () => {
      const data = slices(5, 4, 3, 2, 1, 0);

      // Non-finite falls back to the default cap of 5.
      expect(collapsePieData(data, Number.NaN).display).toHaveLength(5);
      // Below the floor clamps to 2 → one kept slice plus Other.
      expect(collapsePieData(data, 1).display).toHaveLength(2);
      // Floats floor: 4.9 → 4.
      expect(collapsePieData(data, 4.9).display).toHaveLength(4);
      // The clamp is exported so the View's "Show top N" label matches.
      expect(normalizeMaxSegments(undefined)).toBe(5);
      expect(normalizeMaxSegments(1)).toBe(2);
      expect(normalizeMaxSegments(4.9)).toBe(4);
    });
  });
});
