import { describe, expect, it } from "vitest";
import { cohortAverage, fmtPercent } from "../widgets/heatmap/cohort-math.js";
import { SCALE_INK, scaleInk } from "../widgets/shared/color-scale.js";
import { contrastRatio } from "../widgets/shared/color-audit.js";
import { light, dark } from "../widgets/shared/theme.js";

// A triangular retention table: the newest cohort has reached only M0.
//          M0    M1    M2
// Jan    100    40    30     size 1000
// Feb    100    60     —     size  100
// Mar    100     —     —     size   10
const cells = [
  { x: 0, y: 0, value: 100 },
  { x: 1, y: 0, value: 40 },
  { x: 2, y: 0, value: 30 },
  { x: 0, y: 1, value: 100 },
  { x: 1, y: 1, value: 60 },
  { x: 0, y: 2, value: 100 },
];

describe("cohortAverage", () => {
  it("weights each period by cohort size", () => {
    const avg = cohortAverage(cells, 3, 3, [1000, 100, 10]);
    expect(avg.weighted).toBe(true);
    expect(avg.values[0]).toBeCloseTo(100);
    // (40·1000 + 60·100) / 1100, not the plain mean 50
    expect(avg.values[1]).toBeCloseTo(46000 / 1100);
    expect(avg.values[2]).toBeCloseTo(30);
  });

  it("leaves out cohorts that have not reached a period instead of counting them as zero", () => {
    const avg = cohortAverage(cells, 3, 3, [1000, 100, 10]);
    // Only Jan reached M2: its 30% is the average, not (30 + 0 + 0) / 3.
    expect(avg.values[2]).toBe(30);
  });

  it("falls back to a plain mean without sizes", () => {
    const avg = cohortAverage(cells, 3, 3);
    expect(avg.weighted).toBe(false);
    expect(avg.values[1]).toBeCloseTo(50);
  });

  it("treats a size list of the wrong length as no sizes", () => {
    const avg = cohortAverage(cells, 3, 3, [1000, 100]);
    expect(avg.weighted).toBe(false);
    expect(avg.values[1]).toBeCloseTo(50);
  });

  it("keeps values above 100% (net revenue retention)", () => {
    const avg = cohortAverage(
      [
        { x: 0, y: 0, value: 100 },
        { x: 1, y: 0, value: 118 },
        { x: 0, y: 1, value: 100 },
        { x: 1, y: 1, value: 104 },
      ],
      2,
      2,
      [1, 1],
    );
    expect(avg.values[1]).toBeCloseTo(111);
  });

  it("returns null for a period no cohort reached, never NaN", () => {
    const avg = cohortAverage([{ x: 0, y: 0, value: 100 }], 3, 1, [0]);
    expect(avg.values).toEqual([100, null, null]);
  });

  it("ignores out-of-range and non-finite cells", () => {
    const avg = cohortAverage(
      [
        { x: 0, y: 0, value: 50 },
        { x: 5, y: 0, value: 999 },
        { x: 0, y: 4, value: 999 },
        { x: 0, y: 0, value: Number.NaN },
      ],
      1,
      1,
    );
    expect(avg.values).toEqual([50]);
  });
});

describe("fmtPercent", () => {
  it("prints cohort cells as percentages", () => {
    expect(fmtPercent(42.5)).toBe("42.5%");
    expect(fmtPercent(112)).toBe("112%");
  });
});

describe("scaleInk", () => {
  // The printed percentages sit on the scale colour itself, so the ink picked
  // for every step has to clear WCAG AA for small text in both themes.
  for (const [name, tokens] of [["light", light], ["dark", dark]] as const) {
    for (const kind of ["sequential", "diverging"] as const) {
      it(`keeps ${name} ${kind} cell text at 4.5:1 or better`, () => {
        const steps = kind === "sequential" ? tokens.sequential : tokens.diverging;
        const n = steps.length;
        const inkAt = scaleInk(tokens, { kind, min: 0, max: n - 1, midpoint: (n - 1) / 2 });
        steps.forEach((step, i) => {
          const ratio = contrastRatio(SCALE_INK[inkAt(i)], step);
          expect(ratio, `${step} with ${inkAt(i)} ink`).toBeGreaterThanOrEqual(4.5);
        });
      });
    }
  }
});
