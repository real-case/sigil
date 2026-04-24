// Design tokens — SPEC.md §6.2
// Applied via CSS variables; dark/light selected by `prefers-color-scheme`.

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
