// Colour arithmetic for auditing Sigil's palettes — pure functions, no DOM.
//
// Used by `src/__tests__/palette.test.ts` to pin the properties the palette
// was chosen for (colour-vision-deficiency separation of neighbouring series,
// WCAG contrast of marks and text), so that a later edit to `theme.ts` cannot
// quietly undo them. Nothing in a widget bundle imports this module.
//
// Method:
//   - OKLCH ⇄ OKLab ⇄ linear sRGB per Björn Ottosson's reference formulas.
//   - CVD simulation with the Machado–Oliveira–Fernandes (2009) matrices at
//     severity 1.0, applied in linear sRGB.
//   - Colour difference as Euclidean distance in OKLab, scaled ×100
//     (so 1 unit ≈ a just-noticeable step; ≥ 15 reads as clearly distinct).
//   - Contrast as the WCAG 2 relative-luminance ratio.

export type Rgb = readonly [number, number, number];
export type Lab = readonly [number, number, number];

export type Vision = "normal" | "protanopia" | "deuteranopia" | "tritanopia";

// ----- Parsing ---------------------------------------------------------------

const OKLCH_RE =
  /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*[\d.]+%?\s*)?\)$/i;
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parse `oklch(L% C H)` (alpha ignored) or `#rgb`/`#rrggbb` into OKLab. */
export function parseColor(input: string): Lab {
  const s = input.trim();
  const m = OKLCH_RE.exec(s);
  if (m) {
    const l = Number(m[1]) / (m[2] === "%" ? 100 : 1);
    return oklchToOklab(l, Number(m[3]), Number(m[4]));
  }
  const h = HEX_RE.exec(s);
  if (h) return linearSrgbToOklab(hexToLinearSrgb(s));
  throw new Error(`color-audit: unsupported colour "${input}"`);
}

// ----- OKLCH / OKLab / sRGB --------------------------------------------------

export function oklchToOklab(l: number, c: number, hDeg: number): Lab {
  const h = (hDeg * Math.PI) / 180;
  return [l, c * Math.cos(h), c * Math.sin(h)];
}

export function oklabToLinearSrgb([L, a, b]: Lab): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function linearSrgbToOklab([r, g, b]: Rgb): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function toGamma(x: number): number {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

function toLinear(x: number): number {
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function hexToLinearSrgb(hex: string): Rgb {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}

/** Gamut-clipped linear sRGB — what a browser actually paints. */
export function displayedLinearSrgb(color: string): Rgb {
  const [r, g, b] = oklabToLinearSrgb(parseColor(color));
  // Round-trip through 8-bit so the audit sees the same pixels the screen does.
  const q = (x: number) => toLinear(Math.round(clamp01(toGamma(clamp01(x))) * 255) / 255);
  return [q(r), q(g), q(b)];
}

/** `#RRGGBB` for any supported colour, gamut-clipped. */
export function toHex(color: string): string {
  const [r, g, b] = displayedLinearSrgb(color);
  const byte = (x: number) =>
    Math.round(toGamma(x) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`.toUpperCase();
}

// ----- Colour-vision deficiency ---------------------------------------------

// Machado, Oliveira & Fernandes (2009), severity 1.0.
const CVD_MATRICES: Record<Exclude<Vision, "normal">, readonly Rgb[]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export function simulate(rgb: Rgb, vision: Vision): Rgb {
  if (vision === "normal") return rgb;
  const m = CVD_MATRICES[vision];
  const row = (i: number) =>
    clamp01(m[i]![0] * rgb[0] + m[i]![1] * rgb[1] + m[i]![2] * rgb[2]);
  return [row(0), row(1), row(2)];
}

/** OKLab ΔE ×100 between two colours as seen under `vision`. */
export function deltaE(a: string, b: string, vision: Vision = "normal"): number {
  const la = linearSrgbToOklab(simulate(displayedLinearSrgb(a), vision));
  const lb = linearSrgbToOklab(simulate(displayedLinearSrgb(b), vision));
  return 100 * Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}

// ----- WCAG 2 contrast -------------------------------------------------------

export function relativeLuminance(color: string): number {
  const [r, g, b] = displayedLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ----- Palette-level audits --------------------------------------------------

export interface PairScore {
  i: number;
  j: number;
  deltaE: number;
}

/** The worst (smallest) ΔE among neighbouring slots — what bar/line/stack see. */
export function worstAdjacent(palette: readonly string[], vision: Vision): PairScore {
  let worst: PairScore = { i: -1, j: -1, deltaE: Number.POSITIVE_INFINITY };
  for (let i = 0; i < palette.length - 1; i++) {
    const d = deltaE(palette[i]!, palette[i + 1]!, vision);
    if (d < worst.deltaE) worst = { i, j: i + 1, deltaE: d };
  }
  return worst;
}

/** Worst adjacent pair across both dichromacies that matter for red–green CVD. */
export function worstAdjacentCvd(palette: readonly string[]): PairScore {
  const p = worstAdjacent(palette, "protanopia");
  const d = worstAdjacent(palette, "deuteranopia");
  return p.deltaE <= d.deltaE ? p : d;
}

/** OKLCH lightness of a colour, 0–1. */
export function lightness(color: string): number {
  return parseColor(color)[0];
}
