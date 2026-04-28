// Design tokens — SPEC.md §6.2
// Applied via CSS variables; dark/light selected by `prefers-color-scheme`.

import { useEffect, useState } from "react";

export interface ChartDesignTokens {
  seriesColors: string[]; // palette for data series (6+ colors)

  background: string;
  surfaceBackground: string; // tooltip, legend surfaces

  textPrimary: string;
  textSecondary: string; // axis labels, legend
  textMuted: string; // grid labels

  gridLine: string;
  axisLine: string;

  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;

  borderRadius: number;
  fontFamily: string;
  fontSize: { label: number; title: number; tooltip: number };
}

// Design approach: Linear + Vercel Analytics + Stripe Dashboard.
// Neutrals lean toward Zinc (slightly warmer than pure gray). Series palette
// is shared across themes — only backgrounds/text/grid adapt to dark mode.

const seriesPalette = [
  "#6366F1", // indigo — primary brand accent (Linear's signature range)
  "#14B8A6", // teal — secondary, reads well on both bgs
  "#F59E0B", // amber — warm contrast
  "#EC4899", // pink — 4th series, distinct hue
  "#8B5CF6", // violet — close-to-indigo but distinguishable
  "#10B981", // emerald — nature-coded (positive/growth)
];

const systemFontStack =
  '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const typography = {
  borderRadius: 6,
  fontFamily: systemFontStack,
  fontSize: { label: 11, title: 14, tooltip: 12 },
};

export const light: ChartDesignTokens = {
  seriesColors: seriesPalette,

  background: "#FAFAFA",        // zinc-50 — softer than pure white
  surfaceBackground: "#FFFFFF", // tooltips/legends pop above bg

  textPrimary: "#09090B",   // zinc-950 — near-black, not harsh
  textSecondary: "#52525B", // zinc-600 — axis labels
  textMuted: "#A1A1AA",     // zinc-400 — grid labels

  gridLine: "#F4F4F5", // zinc-100 — barely-there
  axisLine: "#E4E4E7", // zinc-200 — subtle but defined

  tooltipBackground: "#FFFFFF",
  tooltipBorder: "#E4E4E7", // zinc-200 + drop shadow recommended in CSS
  tooltipText: "#09090B",

  ...typography,
};

export const dark: ChartDesignTokens = {
  seriesColors: seriesPalette,

  background: "#09090B",        // zinc-950 — Linear-grade dark
  surfaceBackground: "#18181B", // zinc-900 — one step up for surfaces

  textPrimary: "#FAFAFA",   // zinc-50
  textSecondary: "#A1A1AA", // zinc-400 — axis labels
  textMuted: "#52525B",     // zinc-600 — grid labels (low contrast intentional)

  gridLine: "#27272A", // zinc-800
  axisLine: "#3F3F46", // zinc-700

  tooltipBackground: "#18181B",
  tooltipBorder: "#27272A",
  tooltipText: "#FAFAFA",

  ...typography,
};

export function activeTheme(): ChartDesignTokens {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? dark : light;
}

/**
 * React hook returning the active theme tokens. Re-renders when the user's
 * OS-level color-scheme preference changes.
 */
export function useTheme(): ChartDesignTokens {
  const [tokens, setTokens] = useState<ChartDesignTokens>(() => activeTheme());

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setTokens(mq.matches ? dark : light);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return tokens;
}

/**
 * Produces CSS declarations for all non-palette token fields of `tokens`.
 * Emits `--sigil-<field-kebab>` variables plus one var per series color.
 */
function tokensToDeclarations(tokens: ChartDesignTokens): string {
  const decls: string[] = [];
  tokens.seriesColors.forEach((c, i) => decls.push(`--sigil-series-${i}: ${c};`));
  decls.push(`--sigil-bg: ${tokens.background};`);
  decls.push(`--sigil-surface: ${tokens.surfaceBackground};`);
  decls.push(`--sigil-text: ${tokens.textPrimary};`);
  decls.push(`--sigil-text-secondary: ${tokens.textSecondary};`);
  decls.push(`--sigil-text-muted: ${tokens.textMuted};`);
  decls.push(`--sigil-grid: ${tokens.gridLine};`);
  decls.push(`--sigil-axis: ${tokens.axisLine};`);
  decls.push(`--sigil-tooltip-bg: ${tokens.tooltipBackground};`);
  decls.push(`--sigil-tooltip-border: ${tokens.tooltipBorder};`);
  decls.push(`--sigil-tooltip-text: ${tokens.tooltipText};`);
  decls.push(`--sigil-radius: ${tokens.borderRadius}px;`);
  decls.push(`--sigil-font-family: ${tokens.fontFamily};`);
  decls.push(`--sigil-font-label: ${tokens.fontSize.label}px;`);
  decls.push(`--sigil-font-title: ${tokens.fontSize.title}px;`);
  decls.push(`--sigil-font-tooltip: ${tokens.fontSize.tooltip}px;`);
  return decls.join("\n  ");
}

/**
 * Returns a full CSS stylesheet string that binds the light tokens to
 * `:root` and overrides with dark tokens under `prefers-color-scheme: dark`.
 */
export function renderThemeCss(): string {
  return [
    `:root {\n  ${tokensToDeclarations(light)}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root {\n    ${tokensToDeclarations(dark)}\n  }\n}`,
  ].join("\n\n");
}

/**
 * Injects a `<style>` element with both theme blocks into `document.head`.
 * Safe to call multiple times — only the first call installs the stylesheet.
 */
export function installThemeStyles(): void {
  if (typeof document === "undefined") return;
  const id = "sigil-theme-tokens";
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = renderThemeCss();
  document.head.appendChild(el);
}
