import { describe, it, expect } from "vitest";
import {
  sparkPoints,
  cellSortValue,
  cellFilterText,
  cellCsvValue,
  SPARK_WIDTH,
  SPARK_HEIGHT,
  SPARK_PAD_X,
  SPARK_PAD_Y,
} from "../widgets/table/cells.js";

function coords(points: string): Array<[number, number]> {
  return points.split(" ").map((pair) => {
    const [x, y] = pair.split(",");
    return [Number(x), Number(y)];
  });
}

describe("sparkPoints", () => {
  it("keeps every coordinate within the padded 56×16 box", () => {
    const pts = coords(sparkPoints([3, -8, 12, 0, 7, -2, 15, 4]));
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(SPARK_PAD_X);
      expect(x).toBeLessThanOrEqual(SPARK_WIDTH - SPARK_PAD_X);
      expect(y).toBeGreaterThanOrEqual(SPARK_PAD_Y);
      expect(y).toBeLessThanOrEqual(SPARK_HEIGHT - SPARK_PAD_Y);
    }
  });

  it("maps min to the padded bottom and max to the padded top", () => {
    expect(sparkPoints([0, 10])).toBe("2.00,15.00 54.00,1.00");
  });

  it("normalizes negatives the same way", () => {
    expect(sparkPoints([-10, 0, 10])).toBe("2.00,15.00 28.00,8.00 54.00,1.00");
  });

  it("draws a constant series at the vertical midline", () => {
    expect(sparkPoints([5, 5, 5])).toBe("2.00,8.00 28.00,8.00 54.00,8.00");
  });

  it("renders oldest leftmost with x strictly increasing", () => {
    const xs = coords(sparkPoints([9, 1, 4, 6, 2])).map(([x]) => x);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
    }
  });

  it("emits fixed two-decimal coordinates", () => {
    const pts = sparkPoints([1, 2, 4]);
    expect(pts).toBe("2.00,15.00 28.00,10.33 54.00,1.00");
    expect(pts).toMatch(/^\d+\.\d{2},\d+\.\d{2}( \d+\.\d{2},\d+\.\d{2})*$/);
  });

  it("yields an empty string for fewer than 2 values", () => {
    expect(sparkPoints([])).toBe("");
    expect(sparkPoints([7])).toBe("");
  });
});

describe("cell transforms", () => {
  it("cellSortValue returns the last value for sparkline arrays", () => {
    expect(cellSortValue([3, 1, 2], "sparkline")).toBe(2);
  });

  it("cellSortValue treats an empty sparkline array as undefined", () => {
    expect(cellSortValue([], "sparkline")).toBeUndefined();
  });

  it("cellSortValue passes scalars through even under sparkline kind", () => {
    expect(cellSortValue(5, "sparkline")).toBe(5);
    expect(cellSortValue("x", "text")).toBe("x");
    expect(cellSortValue(9, "text")).toBe(9);
    expect(cellSortValue(undefined, "text")).toBeUndefined();
  });

  it("cellFilterText excludes sparkline arrays from the haystack", () => {
    expect(cellFilterText([777, 7, 77], "sparkline")).toBe("");
  });

  it("cellFilterText stringifies scalars under any kind", () => {
    expect(cellFilterText(42, "sparkline")).toBe("42");
    expect(cellFilterText("abc", "text")).toBe("abc");
  });

  it("cellCsvValue joins sparkline arrays with commas", () => {
    expect(cellCsvValue([1, 2, 3], "sparkline")).toBe("1,2,3");
  });

  it("cellCsvValue joins a negative-leading series verbatim", () => {
    // The formula-injection apostrophe is csvField's job downstream — the
    // join itself stays verbatim.
    expect(cellCsvValue([-3, 4], "sparkline")).toBe("-3,4");
  });

  it("cellCsvValue passes scalars through and maps missing cells to empty", () => {
    expect(cellCsvValue(42, "text")).toBe(42);
    expect(cellCsvValue("x", "sparkline")).toBe("x");
    expect(cellCsvValue(undefined, "text")).toBe("");
  });
});
