// Pure maths behind render_info_card. No React — pinned by
// info-card-math.test.ts.
//
// The rules every scale-based variant (bullet, gauge, progress) shares:
// - The scale is min..max. Unset ends are derived so that, by default,
//   nothing is off-scale: the floor is 0 (or the lowest value if below 0),
//   the ceiling a round number above the largest value, target, band and
//   threshold. Only an explicit `min` / `max` can leave a value outside.
// - A value outside the scale is drawn AT the edge and flagged, never past
//   it — a bar that leaves its track reads as a rendering bug, and a clamped
//   bar without a flag reads as the edge value.
// - Status is said in words as well as colour.

import type { InfoCardItem } from "../../shared/payloads.js";

export type Tone = "success" | "warning" | "danger";

export interface Scale {
  min: number;
  max: number;
}

/** Smallest of 1, 2, 2.5, 5 × 10^k that is ≥ `n` (n > 0). */
export function niceCeil(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 1;
  const k = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * k >= n - 1e-9 * k) return m * k;
  }
  return 10 * k;
}

export function scaleOf(
  item: Pick<InfoCardItem, "value" | "target" | "min" | "max" | "bands" | "thresholds" | "unit">,
): Scale {
  const marks = [
    item.value,
    ...(item.target !== undefined ? [item.target] : []),
    ...(item.bands ?? []),
    ...(item.thresholds ? [item.thresholds.warn, item.thresholds.critical] : []),
  ].filter(Number.isFinite);
  const min = item.min ?? Math.min(0, ...marks);
  let max = item.max;
  if (max === undefined) {
    const top = Math.max(...marks);
    // A percentage that fits in 0..100 reads best on a 0..100 scale.
    max =
      item.unit === "%" && top <= 100 && min >= 0
        ? 100
        : top > min
          ? min + niceCeil(top - min)
          : min + 1;
  }
  if (max <= min) max = min + 1;
  return { min, max };
}

export interface Placement {
  /** Position along the scale, clamped to 0..1. */
  pos: number;
  /** Where the value really is, when the scale could not hold it. */
  off: "below" | "above" | null;
}

export function place(value: number, { min, max }: Scale): Placement {
  if (value < min) return { pos: 0, off: "below" };
  if (value > max) return { pos: 1, off: "above" };
  return { pos: (value - min) / (max - min), off: null };
}

export interface Status {
  tone: Tone;
  text: string;
}

/**
 * The item's status in words: from `thresholds` when given, else from
 * `target`, else none. Thresholds are compared inclusively on the good side —
 * a value exactly at `warn` is already a warning.
 */
export function statusOf(
  item: Pick<InfoCardItem, "value" | "target" | "thresholds" | "higherIsBetter">,
): Status | null {
  const up = item.higherIsBetter ?? true;
  const v = item.value;
  if (item.thresholds) {
    const { warn, critical } = item.thresholds;
    const worse = (limit: number) => (up ? v <= limit : v >= limit);
    if (worse(critical)) return { tone: "danger", text: "Critical" };
    if (worse(warn)) return { tone: "warning", text: "Warning" };
    return { tone: "success", text: "OK" };
  }
  if (item.target !== undefined) {
    const met = up ? v >= item.target : v <= item.target;
    if (met) return { tone: "success", text: "On target" };
    return { tone: "warning", text: up ? "Below target" : "Above target" };
  }
  return null;
}

/** value / target, or null when there is no target to divide by. */
export function ofTarget(value: number, target: number | undefined): number | null {
  if (target === undefined || target === 0 || !Number.isFinite(target)) return null;
  return value / target;
}

/** Bullet bands: [from, to] ranges covering the scale, clipped to it. */
export function bandRanges(bands: readonly number[] | undefined, { min, max }: Scale): [number, number][] {
  const edges = [...new Set((bands ?? []).filter((b) => b > min && b < max))].sort((a, b) => a - b);
  const stops = [min, ...edges, max];
  return stops.slice(1).map((to, i) => [stops[i]!, to]);
}

export interface Change {
  delta: number;
  /** Relative change against |baseline|, or null when baseline is 0. */
  ratio: number | null;
  /** Whether the change is good, bad or neither (no change). */
  tone: "success" | "danger" | null;
}

export function changeOf(value: number, baseline: number, higherIsBetter = true): Change {
  const delta = value - baseline;
  const ratio = baseline === 0 ? null : delta / Math.abs(baseline);
  const tone = delta === 0 ? null : (delta > 0) === higherIsBetter ? "success" : "danger";
  return { delta, ratio, tone };
}

/** "▲ 3" / "▼ 2" / "–" for a rank move; null when the move is unknown. */
export function rankMove(rankDelta: number | undefined): { glyph: string; text: string } | null {
  if (rankDelta === undefined) return null;
  if (rankDelta > 0) return { glyph: "▲", text: `up ${rankDelta}` };
  if (rankDelta < 0) return { glyph: "▼", text: `down ${-rankDelta}` };
  return { glyph: "–", text: "unchanged" };
}
