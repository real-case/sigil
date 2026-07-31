import { describe, it, expect } from "vitest";
import { seriesEndIndices, dotRole } from "../widgets/line-chart/end-indices.js";

type Row = Record<string, unknown>;

const rowsFor = (...cells: Array<Record<string, number | null | undefined>>): Row[] =>
  cells.map((c, i) => ({ x: i, ...c }));

describe("seriesEndIndices", () => {
  it("spans the full range for a dense series", () => {
    const rows = rowsFor({ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 });
    expect(seriesEndIndices(rows, ["a"])).toEqual([{ first: 0, last: 4 }]);
  });

  it("anchors each series on its own coverage when x domains are disjoint", () => {
    // a covers rows 0-2, b covers rows 2-4 — merged rows leave gaps as
    // missing keys, exactly like mergeSeries does.
    const rows = rowsFor(
      { a: 1 },
      { a: 2 },
      { a: 3, b: 30 },
      { b: 40 },
      { b: 50 },
    );
    expect(seriesEndIndices(rows, ["a", "b"])).toEqual([
      { first: 0, last: 2 },
      { first: 2, last: 4 },
    ]);
  });

  it("returns first equal to last for a single-point series", () => {
    const rows = rowsFor({ a: 1, b: 10 }, { a: 2 }, { a: 3 });
    expect(seriesEndIndices(rows, ["b"])).toEqual([{ first: 0, last: 0 }]);
  });

  it("returns -1 anchors for a series never present in the rows", () => {
    const rows = rowsFor({ a: 1 }, { a: 2 });
    expect(seriesEndIndices(rows, ["ghost"])).toEqual([{ first: -1, last: -1 }]);
  });

  it("returns -1 anchors on empty rows", () => {
    expect(seriesEndIndices([], ["a"])).toEqual([{ first: -1, last: -1 }]);
  });

  it("skips null-valued cells on both ends", () => {
    const rows = rowsFor({ a: null }, { a: 1 }, { a: 2 }, { a: 3 }, { a: null });
    expect(seriesEndIndices(rows, ["a"])).toEqual([{ first: 1, last: 3 }]);
  });
});

describe("dotRole", () => {
  it("gives end precedence when first equals last (single-point series)", () => {
    expect(dotRole({ index: 2, first: 2, last: 2, sparse: true })).toBe("end");
    expect(dotRole({ index: 2, first: 2, last: 2, sparse: false })).toBe("end");
  });

  it("marks the first anchor as start and the last as end", () => {
    expect(dotRole({ index: 0, first: 0, last: 9, sparse: false })).toBe("start");
    expect(dotRole({ index: 9, first: 0, last: 9, sparse: false })).toBe("end");
  });

  it("keeps quiet markers for interior points of sparse series only", () => {
    expect(dotRole({ index: 4, first: 0, last: 9, sparse: true })).toBe("sparse");
    expect(dotRole({ index: 4, first: 0, last: 9, sparse: false })).toBe("none");
  });

  it("never matches -1 anchors", () => {
    expect(dotRole({ index: 0, first: -1, last: -1, sparse: false })).toBe("none");
    expect(dotRole({ index: 0, first: -1, last: -1, sparse: true })).toBe("sparse");
  });

  it("treats a -1 index sentinel as matching nothing", () => {
    // The View passes index ?? -1; the >= 0 anchor guards keep the sentinel
    // from ever colliding with a -1 anchor from either direction.
    expect(dotRole({ index: -1, first: 0, last: 9, sparse: false })).toBe("none");
    expect(dotRole({ index: -1, first: -1, last: -1, sparse: false })).toBe("none");
  });
});
