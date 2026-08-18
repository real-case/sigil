// Design tokens — derived from specs/design-system-tokens.json.
// Applied via CSS variables; dark/light selected by `prefers-color-scheme`.
// Both the flat legacy fields and the structured fields below describe the
// same theme; legacy names remain so existing widget code keeps working.

import { useEffect, useState } from "react";

// ----- Structured token shapes -----------------------------------------------

export interface SurfaceTokens {
  bg: string;
  surface: string;
  surfaceElevated: string;
  surfaceSunken: string;
}

export interface BorderTokens {
  subtle: string;
  default: string;
  strong: string;
}

export interface TextTokens {
  primary: string;
  secondary: string;
  muted: string;
}

export interface SemanticColor {
  surface: string;
  border: string;
  text: string;
}

export interface SemanticTokens {
  success: SemanticColor;
  warning: SemanticColor;
  danger: SemanticColor;
  info: SemanticColor;
}

export interface FocusRingTokens {
  color: string;
  width: number;
  offset: number;
}

export interface SpacingTokens {
  0: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  "2xl": number;
}

export interface RadiusTokens {
  sm: number;
  md: number;
  lg: number;
  full: number;
}

export interface ElevationTokens {
  low: string;
  mid: string;
  high: string;
}

export interface MotionTokens {
  duration: { fast: number; base: number; slow: number };
  easing: { standard: string; emphasized: string; linear: string };
}

export interface TypeScaleStep {
  family: "sans" | "mono";
  fontSize: number;
  lineHeight: number;
  letterSpacing: number; // em
  fontWeight: number;
  fontVariantNumeric?: string;
  textTransform?: string;
}

export interface TypographyTokens {
  family: { sans: string; mono: string };
  featureSettings: string;
  scale: {
    title: TypeScaleStep;
    label: TypeScaleStep;
    tick: TypeScaleStep;
    axisCap: TypeScaleStep;
    value: TypeScaleStep;
    valueSm: TypeScaleStep;
    valueInline: TypeScaleStep;
    tooltip: TypeScaleStep;
  };
}

export interface ChartDesignTokens {
  // ----- Legacy flat fields (kept for backward compatibility) ---------------
  seriesColors: string[];
  background: string;
  surfaceBackground: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gridLine: string;
  axisLine: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  borderRadius: number;
  fontFamily: string;
  fontSize: { label: number; title: number; tooltip: number };

  // ----- Structured tokens --------------------------------------------------
  surfaces: SurfaceTokens;
  borders: BorderTokens;
  texts: TextTokens;
  chartLines: { grid: string; axis: string };
  tooltip: { background: string; border: string; text: string };
  semantic: SemanticTokens;
  series: string[]; // OKLCH per theme
  focus: FocusRingTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  elevation: ElevationTokens;
  motion: MotionTokens;
  typography: TypographyTokens;
}

// ----- Theme-independent (structural) values ---------------------------------

const spacing: SpacingTokens = {
  0: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
};

const radius: RadiusTokens = { sm: 4, md: 8, lg: 12, full: 999 };

const motion: MotionTokens = {
  duration: { fast: 120, base: 200, slow: 320 },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    emphasized: "cubic-bezier(0.3, 1.4, 0.4, 1)",
    linear: "linear",
  },
};

const FONT_SANS = '"IBM Plex Sans", system-ui, sans-serif';
const FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace';

const typography: TypographyTokens = {
  family: { sans: FONT_SANS, mono: FONT_MONO },
  featureSettings: '"ss01", "cv11"',
  scale: {
    title: {
      family: "sans",
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: -0.01,
      fontWeight: 600,
    },
    label: {
      family: "sans",
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 0,
      fontWeight: 400,
    },
    tick: {
      family: "mono",
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0,
      fontWeight: 400,
      fontVariantNumeric: "tabular-nums",
    },
    axisCap: {
      family: "mono",
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.08,
      fontWeight: 400,
      textTransform: "uppercase",
    },
    value: {
      family: "mono",
      fontSize: 28,
      lineHeight: 28,
      letterSpacing: -0.02,
      fontWeight: 500,
      fontVariantNumeric: "tabular-nums",
    },
    valueSm: {
      family: "mono",
      fontSize: 16,
      lineHeight: 18,
      letterSpacing: 0,
      fontWeight: 500,
      fontVariantNumeric: "tabular-nums",
    },
    valueInline: {
      family: "mono",
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      fontWeight: 400,
      fontVariantNumeric: "tabular-nums",
    },
    tooltip: {
      family: "sans",
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0,
      fontWeight: 400,
    },
  },
};

// ----- Per-theme tokens ------------------------------------------------------

const lightSeries = [
  "oklch(58% 0.16 250)",
  "oklch(60% 0.14 150)",
  "oklch(68% 0.16 65)",
  "oklch(58% 0.20 25)",
  "oklch(54% 0.19 295)",
  "oklch(62% 0.12 200)",
  "oklch(64% 0.18 40)",
  "oklch(58% 0.18 325)",
  "oklch(48% 0.13 240)",
  "oklch(56% 0.10 110)",
];

const darkSeries = [
  "oklch(72% 0.14 250)",
  "oklch(74% 0.13 150)",
  "oklch(80% 0.15 70)",
  "oklch(70% 0.17 25)",
  "oklch(68% 0.18 295)",
  "oklch(74% 0.11 200)",
  "oklch(74% 0.16 40)",
  "oklch(70% 0.16 325)",
  "oklch(62% 0.12 240)",
  "oklch(70% 0.10 110)",
];

const lightElevation: ElevationTokens = {
  low: "0 0 0 0.5px rgba(0,0,0,0.04), 0 1px 2px rgba(15,17,21,0.04)",
  mid: "0 0 0 0.5px rgba(0,0,0,0.04), 0 2px 4px rgba(15,17,21,0.06), 0 8px 16px rgba(15,17,21,0.06)",
  high: "0 0 0 0.5px rgba(0,0,0,0.04), 0 4px 8px rgba(15,17,21,0.06), 0 20px 36px rgba(15,17,21,0.10)",
};

const darkElevation: ElevationTokens = {
  low: "0 0 0 0.5px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)",
  mid: "0 0 0 0.5px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.5)",
  high: "0 0 0 0.5px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.4), 0 20px 36px rgba(0,0,0,0.6)",
};

export const light: ChartDesignTokens = {
  // Legacy flat
  seriesColors: lightSeries,
  background: "#FAFAFB",
  surfaceBackground: "#FFFFFF",
  textPrimary: "#1A1B1F",
  textSecondary: "#4D4E55",
  textMuted: "#888A92",
  gridLine: "#EBEBED",
  axisLine: "#C6C6CB",
  tooltipBackground: "#FFFFFF",
  tooltipBorder: "#DDDDE0",
  tooltipText: "#1A1B1F",
  borderRadius: radius.md,
  fontFamily: FONT_SANS,
  fontSize: { label: 11, title: 17, tooltip: 12 },

  // Structured
  surfaces: {
    bg: "#FAFAFB",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceSunken: "#F2F2F4",
  },
  borders: { subtle: "#ECECEE", default: "#DDDDE0", strong: "#B8B8BD" },
  texts: { primary: "#1A1B1F", secondary: "#4D4E55", muted: "#888A92" },
  chartLines: { grid: "#EBEBED", axis: "#C6C6CB" },
  tooltip: { background: "#FFFFFF", border: "#DDDDE0", text: "#1A1B1F" },
  semantic: {
    success: { surface: "#E8F4ED", border: "#BDDDC8", text: "#1F6E43" },
    warning: { surface: "#FAF1DE", border: "#E6D3A2", text: "#7A5806" },
    danger: { surface: "#FAE9E9", border: "#E5BFC0", text: "#9C2A2A" },
    info: { surface: "#E9EFFA", border: "#BFCDE5", text: "#2D4D8F" },
  },
  series: lightSeries,
  focus: { color: "oklch(58% 0.16 250 / 0.45)", width: 2, offset: 1 },
  spacing,
  radius,
  elevation: lightElevation,
  motion,
  typography,
};

export const dark: ChartDesignTokens = {
  // Legacy flat
  seriesColors: darkSeries,
  background: "#131418",
  surfaceBackground: "#1B1C21",
  textPrimary: "#F2F3F5",
  textSecondary: "#AEB0B8",
  textMuted: "#7B7D86",
  gridLine: "#25272D",
  axisLine: "#3D3F47",
  tooltipBackground: "#23252B",
  tooltipBorder: "#34363D",
  tooltipText: "#F2F3F5",
  borderRadius: radius.md,
  fontFamily: FONT_SANS,
  fontSize: { label: 11, title: 17, tooltip: 12 },

  // Structured
  surfaces: {
    bg: "#131418",
    surface: "#1B1C21",
    surfaceElevated: "#23252B",
    surfaceSunken: "#0E0F12",
  },
  borders: { subtle: "#26282E", default: "#34363D", strong: "#545761" },
  texts: { primary: "#F2F3F5", secondary: "#AEB0B8", muted: "#7B7D86" },
  chartLines: { grid: "#25272D", axis: "#3D3F47" },
  tooltip: { background: "#23252B", border: "#34363D", text: "#F2F3F5" },
  semantic: {
    success: { surface: "#0F2A1E", border: "#1F4E36", text: "#6AC58F" },
    warning: { surface: "#2E2410", border: "#553F1A", text: "#E2B856" },
    danger: { surface: "#2C1414", border: "#582828", text: "#F08A8A" },
    info: { surface: "#15203A", border: "#2C3F6E", text: "#88A8E8" },
  },
  series: darkSeries,
  focus: { color: "oklch(72% 0.14 250 / 0.55)", width: 2, offset: 1 },
  spacing,
  radius,
  elevation: darkElevation,
  motion,
  typography,
};

// ----- Active theme + React hook ---------------------------------------------

export type ThemeName = "light" | "dark";

let forcedTheme: ThemeName | null = null;
const forcedThemeListeners = new Set<() => void>();

// Dev-only override (used by the sandbox). When null, the hook follows
// prefers-color-scheme as before; production widget code never calls this.
export function setForcedTheme(theme: ThemeName | null): void {
  if (forcedTheme === theme) return;
  forcedTheme = theme;
  forcedThemeListeners.forEach((fn) => {
    fn();
  });
}

export function getForcedTheme(): ThemeName | null {
  return forcedTheme;
}

export function activeTheme(): ChartDesignTokens {
  if (forcedTheme) return forcedTheme === "dark" ? dark : light;
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? dark : light;
}

export function useTheme(): ChartDesignTokens {
  const [tokens, setTokens] = useState<ChartDesignTokens>(() => activeTheme());

  useEffect(() => {
    const update = () => setTokens(activeTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    update();
    mq.addEventListener("change", update);
    forcedThemeListeners.add(update);
    return () => {
      mq.removeEventListener("change", update);
      forcedThemeListeners.delete(update);
    };
  }, []);

  return tokens;
}

// ----- CSS variable emission -------------------------------------------------

function scaleVars(name: string, step: TypeScaleStep): string[] {
  const family = step.family === "mono" ? "var(--sigil-font-mono)" : "var(--sigil-font-sans)";
  const out = [
    `--sigil-font-${name}-family: ${family};`,
    `--sigil-font-${name}-size: ${step.fontSize}px;`,
    `--sigil-font-${name}-line-height: ${step.lineHeight}px;`,
    `--sigil-font-${name}-letter-spacing: ${step.letterSpacing}em;`,
    `--sigil-font-${name}-weight: ${step.fontWeight};`,
  ];
  if (step.fontVariantNumeric) {
    out.push(`--sigil-font-${name}-variant-numeric: ${step.fontVariantNumeric};`);
  }
  if (step.textTransform) {
    out.push(`--sigil-font-${name}-transform: ${step.textTransform};`);
  }
  return out;
}

function tokensToDeclarations(t: ChartDesignTokens): string {
  const lines: string[] = [];

  // Series (legacy names)
  t.seriesColors.forEach((c, i) => {
    lines.push(`--sigil-series-${i}: ${c};`);
  });

  // Surfaces
  lines.push(`--sigil-bg: ${t.surfaces.bg};`);
  lines.push(`--sigil-surface: ${t.surfaces.surface};`);
  lines.push(`--sigil-surface-elevated: ${t.surfaces.surfaceElevated};`);
  lines.push(`--sigil-surface-sunken: ${t.surfaces.surfaceSunken};`);

  // Borders
  lines.push(`--sigil-border-subtle: ${t.borders.subtle};`);
  lines.push(`--sigil-border-default: ${t.borders.default};`);
  lines.push(`--sigil-border-strong: ${t.borders.strong};`);

  // Text
  lines.push(`--sigil-text: ${t.texts.primary};`);
  lines.push(`--sigil-text-secondary: ${t.texts.secondary};`);
  lines.push(`--sigil-text-muted: ${t.texts.muted};`);

  // Chart
  lines.push(`--sigil-grid: ${t.chartLines.grid};`);
  lines.push(`--sigil-axis: ${t.chartLines.axis};`);

  // Tooltip
  lines.push(`--sigil-tooltip-bg: ${t.tooltip.background};`);
  lines.push(`--sigil-tooltip-border: ${t.tooltip.border};`);
  lines.push(`--sigil-tooltip-text: ${t.tooltip.text};`);

  // Semantic
  for (const [name, c] of Object.entries(t.semantic)) {
    lines.push(`--sigil-${name}-surface: ${c.surface};`);
    lines.push(`--sigil-${name}-border: ${c.border};`);
    lines.push(`--sigil-${name}-text: ${c.text};`);
  }

  // Focus
  lines.push(`--sigil-focus-ring: ${t.focus.color};`);
  lines.push(`--sigil-focus-ring-width: ${t.focus.width}px;`);
  lines.push(`--sigil-focus-ring-offset: ${t.focus.offset}px;`);

  // Spacing
  lines.push(`--sigil-space-0: ${t.spacing[0]}px;`);
  lines.push(`--sigil-space-xs: ${t.spacing.xs}px;`);
  lines.push(`--sigil-space-sm: ${t.spacing.sm}px;`);
  lines.push(`--sigil-space-md: ${t.spacing.md}px;`);
  lines.push(`--sigil-space-lg: ${t.spacing.lg}px;`);
  lines.push(`--sigil-space-xl: ${t.spacing.xl}px;`);
  lines.push(`--sigil-space-2xl: ${t.spacing["2xl"]}px;`);

  // Radius (scale + legacy alias)
  lines.push(`--sigil-radius-sm: ${t.radius.sm}px;`);
  lines.push(`--sigil-radius-md: ${t.radius.md}px;`);
  lines.push(`--sigil-radius-lg: ${t.radius.lg}px;`);
  lines.push(`--sigil-radius-full: ${t.radius.full}px;`);
  lines.push(`--sigil-radius: ${t.radius.md}px;`); // legacy alias

  // Elevation
  lines.push(`--sigil-shadow-low: ${t.elevation.low};`);
  lines.push(`--sigil-shadow-mid: ${t.elevation.mid};`);
  lines.push(`--sigil-shadow-high: ${t.elevation.high};`);

  // Motion
  lines.push(`--sigil-duration-fast: ${t.motion.duration.fast}ms;`);
  lines.push(`--sigil-duration-base: ${t.motion.duration.base}ms;`);
  lines.push(`--sigil-duration-slow: ${t.motion.duration.slow}ms;`);
  lines.push(`--sigil-easing-standard: ${t.motion.easing.standard};`);
  lines.push(`--sigil-easing-emphasized: ${t.motion.easing.emphasized};`);
  lines.push(`--sigil-easing-linear: ${t.motion.easing.linear};`);

  // Typography — families & feature settings
  lines.push(`--sigil-font-sans: ${t.typography.family.sans};`);
  lines.push(`--sigil-font-mono: ${t.typography.family.mono};`);
  lines.push(`--sigil-font-feature-settings: ${t.typography.featureSettings};`);
  lines.push(`--sigil-font-family: ${t.typography.family.sans};`); // legacy alias

  // Typography scale steps
  for (const [name, step] of Object.entries(t.typography.scale)) {
    const kebab = name.replace(/([A-Z])/g, "-$1").toLowerCase();
    for (const line of scaleVars(kebab, step)) lines.push(line);
  }

  // Legacy font-size shortcuts
  lines.push(`--sigil-font-label: ${t.fontSize.label}px;`);
  lines.push(`--sigil-font-title: ${t.fontSize.title}px;`);
  lines.push(`--sigil-font-tooltip: ${t.fontSize.tooltip}px;`);

  return lines.join("\n  ");
}

export function renderThemeCss(): string {
  return [
    `:root {\n  ${tokensToDeclarations(light)}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root {\n    ${tokensToDeclarations(dark)}\n  }\n}`,
  ].join("\n\n");
}

// Dev-only: emit CSS that lets a `data-sigil-theme` attribute on `<html>`
// override the prefers-color-scheme defaults. Used by the sandbox; not
// referenced by any production widget bundle.
export function renderForcedThemeCss(): string {
  return [
    `:root[data-sigil-theme="light"] {\n  ${tokensToDeclarations(light)}\n}`,
    `:root[data-sigil-theme="dark"] {\n  ${tokensToDeclarations(dark)}\n}`,
  ].join("\n\n");
}

export function installThemeStyles(): void {
  if (typeof document === "undefined") return;
  const id = "sigil-theme-tokens";
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = renderThemeCss();
  document.head.appendChild(el);
}
