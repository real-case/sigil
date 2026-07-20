// Shared SVG text styles + number formatting for chart views.
//
// Three text roles appear inside every plot, per the chart redesign:
//   - tick        numeric axis ticks (mono, tabular)
//   - category    category names along an axis (sans, medium)
//   - axisCap     axis captions like xlabel/ylabel (small caps mono)
// Centralised here so all Recharts views speak the same visual language.

import type { ChartDesignTokens } from "./theme.js";

export function tickTextStyle(tokens: ChartDesignTokens) {
  return {
    fontFamily: tokens.typography.family.mono,
    fontSize: tokens.typography.scale.tick.fontSize,
    fontVariantNumeric: "tabular-nums" as const,
    fill: tokens.texts.muted,
  };
}

export function categoryTextStyle(tokens: ChartDesignTokens) {
  return {
    fontFamily: tokens.typography.family.sans,
    fontSize: 13.5,
    fontWeight: 500,
    fill: tokens.texts.secondary,
  };
}

export function axisCapTextStyle(tokens: ChartDesignTokens) {
  const cap = tokens.typography.scale.axisCap;
  return {
    fontFamily: tokens.typography.family.mono,
    fontSize: cap.fontSize,
    letterSpacing: `${cap.letterSpacing}em`,
    textTransform: "uppercase" as const,
    fill: tokens.texts.muted,
  };
}

// ----- Number formatting -------------------------------------------------
// en-US keeps rendering deterministic across hosts (and matches the design
// comps); raw values still flow into CSV untouched.

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function fmtNumber(n: number): string {
  return Number.isFinite(n) ? numberFmt.format(n) : String(n);
}

export function fmtCompact(n: number): string {
  return Number.isFinite(n) ? compactFmt.format(n) : String(n);
}

/** 0.405 → "40.5%" */
export function fmtShare(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

/** Stat-sized number: full with separators when short, compact when large. */
export function fmtStat(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return Math.abs(n) >= 10_000
    ? fmtCompact(n)
    : fmtNumber(Math.round(n * 10) / 10);
}
