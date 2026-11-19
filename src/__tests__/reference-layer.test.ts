import { describe, it, expect } from "vitest";
import { light, dark } from "../widgets/shared/theme.js";
import { contrastRatio } from "../widgets/shared/color-audit.js";
import {
  referenceLabelPosition,
  referenceToneColors,
  screenAxisOf,
} from "../widgets/shared/reference-layer.js";

const TONES = ["neutral", "success", "warning", "danger"] as const;

describe.each([
  ["light", light],
  ["dark", dark],
] as const)("reference tones (%s)", (_name, t) => {
  it("map semantic tones onto the status tokens", () => {
    expect(referenceToneColors(t, "danger").text).toBe(t.semantic.danger.text);
    expect(referenceToneColors(t, "success").fill).toBe(t.semantic.success.surface);
    expect(referenceToneColors(t, "warning").stroke).toBe(t.semantic.warning.text);
  });

  it("default to neutral", () => {
    expect(referenceToneColors(t)).toEqual(referenceToneColors(t, "neutral"));
    expect(referenceToneColors(t).text).toBe(t.texts.secondary);
  });

  it.each(TONES)("%s labels read at ≥ 4.5:1 on the plot surface", (tone) => {
    const { text } = referenceToneColors(t, tone);
    expect(contrastRatio(text, t.surfaces.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TONES)("%s lines read at ≥ 3:1 on the plot surface", (tone) => {
    const { stroke } = referenceToneColors(t, tone);
    expect(contrastRatio(stroke, t.surfaces.surface)).toBeGreaterThanOrEqual(3);
  });
});

describe("reference label placement", () => {
  it("labels a horizontal line above its right end and a vertical line at its top", () => {
    expect(referenceLabelPosition("y", "line")).toBe("insideBottomRight");
    expect(referenceLabelPosition("x", "line")).toBe("insideTopLeft");
  });

  it("labels a band inside its top edge", () => {
    expect(referenceLabelPosition("y", "band")).toBe("insideTopLeft");
    expect(referenceLabelPosition("x", "band")).toBe("insideTop");
  });

  it("swaps axes on a horizontal bar chart, where values run along screen x", () => {
    expect(screenAxisOf("y", false)).toBe("y");
    expect(screenAxisOf("y", true)).toBe("x");
    expect(screenAxisOf("x", true)).toBe("y");
  });
});
