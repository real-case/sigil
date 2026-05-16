import { describe, it, expect } from "vitest";
import { renderThemeCss, light, dark } from "../widgets/shared/theme.js";

const EXPECTED_VARS = [
  // Series palette
  ...Array.from({ length: 10 }, (_, i) => `--sigil-series-${i}`),

  // Surfaces
  "--sigil-bg",
  "--sigil-surface",
  "--sigil-surface-elevated",
  "--sigil-surface-sunken",

  // Borders
  "--sigil-border-subtle",
  "--sigil-border-default",
  "--sigil-border-strong",

  // Text
  "--sigil-text",
  "--sigil-text-secondary",
  "--sigil-text-muted",

  // Chart lines
  "--sigil-grid",
  "--sigil-axis",

  // Tooltip
  "--sigil-tooltip-bg",
  "--sigil-tooltip-border",
  "--sigil-tooltip-text",

  // Semantic
  "--sigil-success-surface",
  "--sigil-success-border",
  "--sigil-success-text",
  "--sigil-warning-surface",
  "--sigil-warning-border",
  "--sigil-warning-text",
  "--sigil-danger-surface",
  "--sigil-danger-border",
  "--sigil-danger-text",
  "--sigil-info-surface",
  "--sigil-info-border",
  "--sigil-info-text",

  // Focus
  "--sigil-focus-ring",
  "--sigil-focus-ring-width",
  "--sigil-focus-ring-offset",

  // Spacing
  "--sigil-space-0",
  "--sigil-space-xs",
  "--sigil-space-sm",
  "--sigil-space-md",
  "--sigil-space-lg",
  "--sigil-space-xl",
  "--sigil-space-2xl",

  // Radius scale + legacy alias
  "--sigil-radius-sm",
  "--sigil-radius-md",
  "--sigil-radius-lg",
  "--sigil-radius-full",
  "--sigil-radius",

  // Elevation
  "--sigil-shadow-low",
  "--sigil-shadow-mid",
  "--sigil-shadow-high",

  // Motion
  "--sigil-duration-fast",
  "--sigil-duration-base",
  "--sigil-duration-slow",
  "--sigil-easing-standard",
  "--sigil-easing-emphasized",
  "--sigil-easing-linear",

  // Typography families & legacy alias
  "--sigil-font-sans",
  "--sigil-font-mono",
  "--sigil-font-family",
  "--sigil-font-feature-settings",

  // Typography scale steps (family + size + line-height + letter-spacing + weight per step)
  "--sigil-font-title-family",
  "--sigil-font-title-size",
  "--sigil-font-title-line-height",
  "--sigil-font-label-family",
  "--sigil-font-label-size",
  "--sigil-font-tick-family",
  "--sigil-font-tick-size",
  "--sigil-font-tick-transform",
  "--sigil-font-value-family",
  "--sigil-font-value-size",
  "--sigil-font-value-variant-numeric",
  "--sigil-font-value-sm-family",
  "--sigil-font-value-sm-size",
  "--sigil-font-value-inline-family",
  "--sigil-font-tooltip-family",
  "--sigil-font-tooltip-size",

  // Legacy font shortcuts
  "--sigil-font-label",
  "--sigil-font-title",
  "--sigil-font-tooltip",
];

describe("theme token surface", () => {
  const css = renderThemeCss();

  it("emits :root and @media prefers-color-scheme blocks", () => {
    expect(css).toContain(":root {");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
  });

  for (const name of EXPECTED_VARS) {
    it(`emits ${name}`, () => {
      expect(css).toContain(`${name}:`);
    });
  }

  it("light series palette has 10 OKLCH values", () => {
    expect(light.series).toHaveLength(10);
    expect(light.series.every((c) => c.startsWith("oklch("))).toBe(true);
  });

  it("dark series palette has 10 OKLCH values", () => {
    expect(dark.series).toHaveLength(10);
    expect(dark.series.every((c) => c.startsWith("oklch("))).toBe(true);
  });

  it("light and dark series palettes differ", () => {
    expect(light.series).not.toEqual(dark.series);
  });

  it("preserves legacy flat fields for backward compatibility", () => {
    expect(light.seriesColors).toEqual(light.series);
    expect(light.background).toBe(light.surfaces.bg);
    expect(light.tooltipBackground).toBe(light.tooltip.background);
    expect(dark.gridLine).toBe(dark.chartLines.grid);
  });

  it("emits each typography scale step with a family reference", () => {
    const lightBlock = css.slice(0, css.indexOf("@media"));
    for (const step of ["title", "label", "tick", "value", "tooltip"]) {
      expect(lightBlock).toMatch(
        new RegExp(`--sigil-font-${step}-family:\\s*var\\(--sigil-font-(sans|mono)\\)`),
      );
    }
  });
});
