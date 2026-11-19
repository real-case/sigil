// Pure half of the shared reference layer: what a reference mark looks like
// and where its label goes, with no React or Recharts in sight so both can be
// pinned by unit tests. ReferenceLayer.tsx turns these into Recharts elements.
//
// One mapping for bar, line and scatter is the point of the module: a
// "danger" threshold is the same red in every chart and in both themes, and a
// band always carries its label so the meaning never rests on colour alone
// (WCAG 1.4.1).

import type { ReferenceMark, ReferenceTone } from "../../shared/payloads.js";
import type { ChartDesignTokens } from "./theme.js";

export interface ReferenceToneColors {
  /** Stroke of a line, edge of a band. */
  stroke: string;
  /** Band fill (drawn at BAND_FILL_OPACITY). */
  fill: string;
  /** Label text. */
  text: string;
}

export const BAND_FILL_OPACITY = 0.55;
export const REFERENCE_DASH = "5 4";

/**
 * Tone → colours. Semantic tones reuse the status tokens the stat panel
 * already uses, whose `text` member is tuned for contrast on the plot surface
 * in each theme; neutral reads as secondary text so a plain average or plan
 * line stays quieter than the data.
 */
export function referenceToneColors(
  tokens: ChartDesignTokens,
  tone: ReferenceTone = "neutral",
): ReferenceToneColors {
  if (tone === "neutral") {
    return {
      stroke: tokens.texts.secondary,
      fill: tokens.surfaces.surfaceSunken,
      text: tokens.texts.secondary,
    };
  }
  const s = tokens.semantic[tone === "danger" ? "danger" : tone === "warning" ? "warning" : "success"];
  return { stroke: s.text, fill: s.surface, text: s.text };
}

/** A Recharts label position (the subset this layer uses). */
export type ReferenceLabelPosition =
  | "insideBottomRight"
  | "insideTopLeft"
  | "insideTop";

/**
 * Where a mark's label sits, in Recharts' terms, for the axis the mark is
 * drawn against *on screen* — after any bar-chart orientation swap.
 *
 * - A horizontal line (screen y) labels above itself at the right end, clear
 *   of the y-axis ticks and of most line ends.
 * - A vertical line (screen x) labels at the top, just right of the line.
 * - A band labels inside its own top edge: left-aligned for a horizontal band,
 *   centred for a vertical one.
 */
export function referenceLabelPosition(
  screenAxis: "x" | "y",
  kind: ReferenceMark["kind"],
): ReferenceLabelPosition {
  if (kind === "line") return screenAxis === "y" ? "insideBottomRight" : "insideTopLeft";
  return screenAxis === "y" ? "insideTopLeft" : "insideTop";
}

/**
 * The screen axis a payload axis lands on. On a horizontal bar chart the
 * value axis — payload "y" — runs along the screen x, and the categories
 * along the screen y.
 */
export function screenAxisOf(
  axis: ReferenceMark["axis"],
  swapped: boolean,
): "x" | "y" {
  if (!swapped) return axis;
  return axis === "x" ? "y" : "x";
}
