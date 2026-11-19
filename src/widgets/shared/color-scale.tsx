// Shared colour scales — used by the heatmap matrix and the map choropleth.
//
// Both scales are explicit OKLCH-designed steps from the theme tokens
// (`tokens.sequential`, `tokens.diverging`), not an alpha over a series hue:
// alpha made the low end depend on whatever sat underneath and could not
// invert the anchor for the dark theme. Between steps the colour is mixed in
// OKLab, so the ramp stays smooth without banding. The legend samples the
// same function, so "what colour means what value" cannot drift between the
// marks and their key.

import type { ChartDesignTokens } from "./theme.js";
import { contrastRatio } from "./color-audit.js";

export type ColorScaleKind = "sequential" | "diverging";

export interface ColorScaleOptions {
  kind?: ColorScaleKind;
  min: number;
  max: number;
  /** Diverging only: the value that maps to the neutral middle. Default 0. */
  midpoint?: number;
}

/** Colour at fractional position `pos` ∈ [0, steps.length − 1] along `steps`. */
export function rampAt(steps: readonly string[], pos: number): string {
  const last = steps.length - 1;
  const p = Math.max(0, Math.min(last, Number.isFinite(pos) ? pos : 0));
  const i = Math.min(Math.floor(p), last - 1);
  const f = p - i;
  if (f <= 1e-6) return steps[i]!;
  if (f >= 1 - 1e-6) return steps[i + 1]!;
  return `color-mix(in oklab, ${steps[i]} ${((1 - f) * 100).toFixed(1)}%, ${steps[i + 1]})`;
}

/** Position of `value` on a sequential ramp of `n` steps; mid-ramp when min = max. */
export function sequentialPosition(value: number, min: number, max: number, n: number): number {
  const range = max - min;
  const t = range === 0 ? 0.5 : Math.max(0, Math.min(1, (value - min) / range));
  return t * (n - 1);
}

/**
 * Position of `value` on a diverging ramp of `n` (odd) steps. The midpoint is
 * pinned to the neutral centre step and both arms share one unit — the larger
 * of the two distances from the midpoint — so an asymmetric range uses only
 * part of its short arm instead of stretching it to the extreme colour.
 */
export function divergingPosition(
  value: number,
  min: number,
  max: number,
  midpoint: number,
  n: number,
): number {
  const centre = (n - 1) / 2;
  const span = Math.max(Math.abs(max - midpoint), Math.abs(min - midpoint));
  if (span === 0) return centre;
  const u = Math.max(-1, Math.min(1, (value - midpoint) / span));
  return centre + u * centre;
}

/** Build `value → CSS colour` for the given scale and data range. */
export function colorScale(
  tokens: ChartDesignTokens,
  { kind = "sequential", min, max, midpoint = 0 }: ColorScaleOptions,
): (value: number) => string {
  if (kind === "diverging") {
    const steps = tokens.diverging;
    return (v) => rampAt(steps, divergingPosition(v, min, max, midpoint, steps.length));
  }
  const steps = tokens.sequential;
  return (v) => rampAt(steps, sequentialPosition(v, min, max, steps.length));
}

/**
 * Which ink reads on top of the scale colour at `value`: whichever of
 * `SCALE_INK` has the higher contrast on the nearest explicit step. The step
 * stands in for the in-between mix, which is close enough — neighbouring
 * steps are only ~0.1 apart in OKLCH lightness — and keeps the browser out of
 * the maths.
 */
export function scaleInk(
  tokens: ChartDesignTokens,
  { kind = "sequential", min, max, midpoint = 0 }: ColorScaleOptions,
): (value: number) => "dark" | "light" {
  const steps = kind === "diverging" ? tokens.diverging : tokens.sequential;
  const ink = steps.map((step): "dark" | "light" =>
    contrastRatio(step, SCALE_INK.dark) >= contrastRatio(step, SCALE_INK.light) ? "dark" : "light",
  );
  return (v) => {
    const pos =
      kind === "diverging"
        ? divergingPosition(v, min, max, midpoint, steps.length)
        : sequentialPosition(v, min, max, steps.length);
    return ink[Math.round(pos)] ?? "dark";
  };
}

/** The two inks `scaleInk` chooses between. */
// The dark ink is a touch deeper than texts.primary: the mid-ramp light blue
// (#2784D5) clears 4.5:1 with neither #1A1B1F nor white.
export const SCALE_INK = { dark: "#0F1012", light: "#FFFFFF" } as const;

const DEFAULT_FMT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });
const LEGEND_SAMPLES = 13;
const LEGEND_WIDTH = 160;

// Continuous min→max legend. The gradient samples `colorAt` across the data
// range, so a diverging scale shows exactly the part of each arm the data uses.
export function ColorScaleLegend({
  min,
  max,
  colorAt,
  tokens,
  midpoint,
  format = (n) => DEFAULT_FMT.format(n),
}: {
  min: number;
  max: number;
  colorAt: (value: number) => string;
  tokens: ChartDesignTokens;
  /** Diverging only: marks where the neutral middle falls, when in range. */
  midpoint?: number;
  format?: (n: number) => string;
}) {
  const stops = Array.from({ length: LEGEND_SAMPLES }, (_, k) => {
    const t = k / (LEGEND_SAMPLES - 1);
    return `${colorAt(min + (max - min) * t)} ${(t * 100).toFixed(1)}%`;
  });
  const gradient = `linear-gradient(90deg, ${stops.join(", ")})`;
  const labelStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: tokens.typography.scale.tick.fontSize,
    fontVariantNumeric: "tabular-nums" as const,
    color: tokens.texts.muted,
  };
  const mid =
    midpoint !== undefined && max > min && midpoint > min && midpoint < max
      ? { pct: ((midpoint - min) / (max - min)) * 100, label: format(midpoint) }
      : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingTop: 12,
        paddingBottom: mid === null ? 0 : 14,
      }}
    >
      <span style={labelStyle}>{format(min)}</span>
      <div style={{ position: "relative", width: LEGEND_WIDTH, height: 8 }}>
        <div
          className="sigil-scale-bar"
          aria-hidden="true"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: tokens.radius.full,
            background: gradient,
            border: `0.5px solid ${tokens.borders.subtle}`,
          }}
        />
        {mid !== null && (
          <>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: `${mid.pct}%`,
                top: -2,
                width: 1,
                height: 12,
                background: tokens.texts.secondary,
              }}
            />
            <span
              style={{
                ...labelStyle,
                position: "absolute",
                left: `${mid.pct}%`,
                top: 12,
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
              }}
            >
              {mid.label}
            </span>
          </>
        )}
      </div>
      <span style={labelStyle}>{format(max)}</span>
    </div>
  );
}
