// Shared single-hue sequential color scale — used by the heatmap matrix and
// the map choropleth. A value in [min, max] maps to an alpha applied over the
// series hue; the legend renders the same ramp as a horizontal gradient bar so
// "what colour means what value" reads consistently across both widgets.

import type { ChartDesignTokens } from "./theme.js";

// Alpha stops for the intensity ramp: series hue at 8% / 35% / 75% / 100%.
// Piecewise-linear interpolation gives smooth gradients without banding.
export const ALPHA_STOPS = [
  { t: 0.0, a: 0.08 },
  { t: 0.33, a: 0.35 },
  { t: 0.67, a: 0.75 },
  { t: 1.0, a: 1.0 },
] as const;

export function intensityAlpha(value: number, min: number, max: number): number {
  const range = max - min;
  const t = range === 0 ? 0.5 : Math.max(0, Math.min(1, (value - min) / range));
  for (let i = 0; i < ALPHA_STOPS.length - 1; i++) {
    const a = ALPHA_STOPS[i]!;
    const b = ALPHA_STOPS[i + 1]!;
    if (t <= b.t) {
      const local = (t - a.t) / (b.t - a.t);
      return a.a + (b.a - a.a) * local;
    }
  }
  return 1;
}

const DEFAULT_FMT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });

// Continuous min→max legend mirroring the intensity ramp. The gradient mixes
// the series hue toward the widget background at the same alpha stops used by
// `intensityAlpha`.
export function ColorScaleLegend({
  min,
  max,
  hue,
  tokens,
  format = (n) => DEFAULT_FMT.format(n),
  baseColor = "var(--sigil-bg)",
}: {
  min: number;
  max: number;
  hue: string;
  tokens: ChartDesignTokens;
  format?: (n: number) => string;
  /** Colour the low end of the ramp mixes toward. Defaults to the widget bg;
   *  the map choropleth passes its no-data land colour so the bar matches the
   *  fills (hue composited over land rather than over the ocean/background). */
  baseColor?: string;
}) {
  const stop = (pct: number, pos: number) =>
    `color-mix(in oklab, ${hue} ${pct}%, ${baseColor}) ${pos}%`;
  const gradient = `linear-gradient(90deg, ${stop(8, 0)}, ${stop(35, 33)}, ${stop(75, 67)}, ${hue} 100%)`;
  const labelStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: tokens.typography.scale.tick.fontSize,
    fontVariantNumeric: "tabular-nums" as const,
    color: tokens.texts.muted,
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingTop: 12,
      }}
    >
      <span style={labelStyle}>{format(min)}</span>
      <div
        aria-hidden
        style={{
          width: 160,
          height: 8,
          borderRadius: tokens.radius.full,
          background: gradient,
          border: `0.5px solid ${tokens.borders.subtle}`,
        }}
      />
      <span style={labelStyle}>{format(max)}</span>
    </div>
  );
}
