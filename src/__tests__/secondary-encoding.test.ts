import { describe, expect, it } from "vitest";
import { lineDash, markerShape, shapePath } from "../widgets/shared/secondary-encoding.js";
import { MARKER_SHAPES } from "../shared/schemas.js";

describe("secondary encoding", () => {
  it("keeps circles and solid lines unless asked", () => {
    expect(markerShape(3, undefined, false)).toBe("circle");
    expect(lineDash(3, undefined, false)).toBeUndefined();
  });

  it("gives each series its own shape and pattern when enabled", () => {
    const shapes = MARKER_SHAPES.map((_, i) => markerShape(i, undefined, true));
    expect(new Set(shapes).size).toBe(MARKER_SHAPES.length);
    expect(lineDash(0, undefined, true)).toBeUndefined();
    expect(lineDash(1, undefined, true)).toBeDefined();
    expect(lineDash(1, undefined, true)).not.toBe(lineDash(2, undefined, true));
  });

  it("lets a series override the automatic choice", () => {
    expect(markerShape(0, "star", true)).toBe("star");
    expect(lineDash(1, "solid", true)).toBeUndefined();
    expect(lineDash(0, "dotted", false)).toBe("2 4");
  });

  it("draws a closed path for every shape", () => {
    for (const s of MARKER_SHAPES) expect(shapePath(s, 7, 7, 5)).toMatch(/^M .*(z|0)$/);
  });
});
