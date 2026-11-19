// Pins the properties Sigil's colours were chosen for, so an edit to
// `theme.ts` cannot quietly undo them. The arithmetic lives in
// `src/widgets/shared/color-audit.ts`; see its header for the method.
//
// Thresholds (OKLab ΔE ×100, WCAG 2 contrast):
//   - neighbouring categorical slots ≥ 8 under protanopia and deuteranopia,
//     ≥ 15 with normal vision — bar/line/stack put neighbours side by side;
//   - every categorical slot ≥ 3:1 against the chart surface (WCAG 1.4.11);
//   - muted text ≥ 4.5:1 against every surface it sits on (WCAG 1.4.3).

import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  deltaE,
  lightness,
  toHex,
  worstAdjacent,
  worstAdjacentCvd,
} from "../widgets/shared/color-audit.js";
import {
  SERIES_CYCLE,
  dark,
  light,
  seriesColor,
  type ChartDesignTokens,
} from "../widgets/shared/theme.js";

const CVD_MIN = 8;
const NORMAL_MIN = 15;
const MARK_CONTRAST = 3;
const TEXT_CONTRAST = 4.5;

const THEMES: [string, ChartDesignTokens][] = [
  ["light", light],
  ["dark", dark],
];

const categorical = (t: ChartDesignTokens) => t.series.slice(0, SERIES_CYCLE);

describe("color-audit arithmetic", () => {
  it("converts OKLCH to the expected sRGB hex", () => {
    expect(toHex("oklch(58% 0.16 250)")).toBe("#0D7DD4");
    expect(toHex("oklch(72% 0.14 250)")).toBe("#59AAF8");
  });

  it("gives the textbook WCAG ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  it("collapses red and green under dichromacy but not under normal vision", () => {
    expect(deltaE("#FF0000", "#00A000", "normal")).toBeGreaterThan(30);
    expect(deltaE("#D73337", "#319751", "deuteranopia")).toBeLessThan(
      deltaE("#D73337", "#319751", "normal") / 2,
    );
  });

  it("flags the pre-0.3.0 series order (green next to amber)", () => {
    // The order shipped up to 0.2.0, same hex. If this stops failing the
    // threshold, the audit has lost its teeth rather than the palette its flaw.
    const old = [
      "oklch(58% 0.16 250)",
      "oklch(60% 0.14 150)",
      "oklch(68% 0.16 65)",
      "oklch(58% 0.20 25)",
      "oklch(54% 0.19 295)",
      "oklch(62% 0.12 200)",
      "oklch(64% 0.18 40)",
      "oklch(58% 0.18 325)",
    ];
    const worst = worstAdjacentCvd(old);
    expect(worst.deltaE).toBeLessThan(CVD_MIN);
    expect([worst.i, worst.j]).toEqual([1, 2]);
  });
});

describe.each(THEMES)("%s categorical palette", (_name, t) => {
  const palette = categorical(t);

  it(`has ${SERIES_CYCLE} categorical slots, blue first`, () => {
    expect(palette).toHaveLength(SERIES_CYCLE);
    expect(palette[0]).toMatch(/ 250\)$/);
  });

  it(`keeps neighbours ≥ ${CVD_MIN} ΔE under protanopia and deuteranopia`, () => {
    const worst = worstAdjacentCvd(palette);
    expect(
      worst.deltaE,
      `slots ${worst.i}/${worst.j} (${palette[worst.i]} / ${palette[worst.j]})`,
    ).toBeGreaterThanOrEqual(CVD_MIN);
  });

  it(`keeps neighbours ≥ ${NORMAL_MIN} ΔE with normal vision`, () => {
    const worst = worstAdjacent(palette, "normal");
    expect(worst.deltaE, `slots ${worst.i}/${worst.j}`).toBeGreaterThanOrEqual(NORMAL_MIN);
  });

  it(`gives every slot ≥ ${MARK_CONTRAST}:1 against the surface`, () => {
    for (const [i, c] of palette.entries()) {
      for (const bg of [t.surfaces.surface, t.surfaces.bg]) {
        expect(contrastRatio(c, bg), `slot ${i} ${c} on ${bg}`).toBeGreaterThanOrEqual(
          MARK_CONTRAST,
        );
      }
    }
  });
});

describe.each(THEMES)("%s text contrast", (_name, t) => {
  const grounds = {
    bg: t.surfaces.bg,
    surface: t.surfaces.surface,
    surfaceElevated: t.surfaces.surfaceElevated,
    tooltip: t.tooltip.background,
  };

  for (const role of ["primary", "secondary", "muted"] as const) {
    it(`texts.${role} ≥ ${TEXT_CONTRAST}:1 on every surface`, () => {
      for (const [name, bg] of Object.entries(grounds)) {
        expect(
          contrastRatio(t.texts[role], bg),
          `${role} ${t.texts[role]} on ${name} ${bg}`,
        ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
      }
    });
  }

  it("keeps the legacy flat textMuted in step with texts.muted", () => {
    expect(t.textMuted).toBe(t.texts.muted);
  });
});

describe.each(THEMES)("%s sequential scale", (name, t) => {
  it("has 7 steps with strictly monotonic lightness", () => {
    expect(t.sequential).toHaveLength(7);
    const ls = t.sequential.map(lightness);
    for (let i = 1; i < ls.length; i++) {
      const step = ls[i]! - ls[i - 1]!;
      // Light theme: low values light, high dark. Dark theme inverts the anchor.
      if (name === "light") expect(step).toBeLessThan(-0.05);
      else expect(step).toBeGreaterThan(0.05);
    }
  });

  it("starts near the background and ends far from it", () => {
    const first = contrastRatio(t.sequential[0]!, t.surfaces.surface);
    const last = contrastRatio(t.sequential.at(-1)!, t.surfaces.surface);
    expect(first).toBeLessThan(1.6);
    expect(last).toBeGreaterThan(MARK_CONTRAST);
  });
});

describe.each(THEMES)("%s diverging scale", (name, t) => {
  it("has 9 steps around a neutral midpoint", () => {
    expect(t.diverging).toHaveLength(9);
    const mid = t.diverging[4]!;
    // Neutral: no hue to speak of.
    expect(deltaE(mid, toGreyOf(mid))).toBeLessThan(1);
  });

  it("moves away from the midpoint monotonically on both arms", () => {
    const ls = t.diverging.map(lightness);
    const sign = name === "light" ? -1 : 1; // dark theme: extremes are lighter
    for (let k = 1; k <= 4; k++) {
      expect(sign * (ls[4 + k]! - ls[4 + k - 1]!)).toBeGreaterThan(0);
      expect(sign * (ls[4 - k]! - ls[4 - k + 1]!)).toBeGreaterThan(0);
    }
  });

  it("keeps mirrored steps of the two arms apart under CVD", () => {
    for (let k = 1; k <= 4; k++) {
      const neg = t.diverging[4 - k]!;
      const pos = t.diverging[4 + k]!;
      for (const v of ["protanopia", "deuteranopia"] as const) {
        expect(deltaE(neg, pos, v), `±${k} under ${v}`).toBeGreaterThanOrEqual(CVD_MIN);
      }
    }
  });
});

describe("seriesColor", () => {
  it("hands out the categorical slots in order", () => {
    for (let i = 0; i < SERIES_CYCLE; i++) {
      expect(seriesColor(light, i)).toBe(light.series[i]);
      expect(seriesColor(light, i, "cycle")).toBe(light.series[i]);
    }
  });

  it("turns slot 9 onward neutral by default", () => {
    expect(seriesColor(light, SERIES_CYCLE)).toBe(light.texts.muted);
    expect(seriesColor(dark, SERIES_CYCLE + 5)).toBe(dark.texts.muted);
  });

  it("cycles the eight slots under the cycle policy, never reaching 8–9", () => {
    expect(seriesColor(light, SERIES_CYCLE, "cycle")).toBe(light.series[0]);
    expect(seriesColor(light, SERIES_CYCLE + 1, "cycle")).toBe(light.series[1]);
    for (let i = 0; i < 40; i++) {
      const c = seriesColor(dark, i, "cycle");
      expect(c).not.toBe(dark.series[8]);
      expect(c).not.toBe(dark.series[9]);
    }
  });
});

function toGreyOf(color: string): string {
  const hex = toHex(color);
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const y = Math.round((r + g + b) / 3)
    .toString(16)
    .padStart(2, "0");
  return `#${y}${y}${y}`;
}
