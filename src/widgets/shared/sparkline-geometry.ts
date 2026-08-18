// The geometry behind every sparkline: normalise a series, inset it, and emit
// coordinates. Pure — no DOM, no React — so it is testable in the node env and
// so a consumer can render the points however it likes.
//
// It exists because the geometry was written twice, and the copies had drifted
// apart in three ways before anyone compared them (see `flat` below). A third
// copy was about to arrive with the info cards, which is where the cost of that
// flipped.
//
// This module deliberately does NOT unify the two conventions. Both call sites
// must keep rendering exactly what they render today, so the differences move
// here as options rather than being resolved — see `src/__tests__/
// sparkline-geometry.test.ts`, which pins both against captured output.

/** A formatted coordinate pair. Fixed 2dp so output is stable across engines. */
export interface SparkPoint {
  readonly x: string;
  readonly y: string;
}

export interface SparkBox {
  readonly width: number;
  readonly height: number;
  /** Horizontal inset. Keeps end markers inside the viewport. */
  readonly padX: number;
  /** Vertical inset. Enough for the stroke width, no more. */
  readonly padY: number;
  /**
   * Where a series with no range sits, which the two consumers answer
   * differently:
   *
   * - `"middle"` — the vertical midline, so a flat series reads as flat. The
   *   table does this.
   * - `"floor"` — the bottom inset, which is what `range = max - min || 1`
   *   works out to. The stat panel does this, so a metric that did not move
   *   draws along the floor as though it were at its minimum. Preserved here
   *   because this module is a refactor; whether it is right is a separate
   *   question, raised with the consolidation.
   */
  readonly flat: "middle" | "floor";
}

/**
 * Coordinates for `values` (oldest → newest) inside `box`, min/max normalised
 * with y inverted so the maximum is up.
 *
 * Fewer than two values yields an empty array: one point is a dot, not a line,
 * and the `i / (n - 1)` term is 0/0 there. Callers that render a single value
 * do so themselves.
 */
export function sparkPoints(
  values: readonly number[],
  box: SparkBox,
): readonly SparkPoint[] {
  if (values.length < 2) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const n = values.length;

  const x = (i: number) => box.padX + (i / (n - 1)) * (box.width - box.padX * 2);
  const y = (v: number) => {
    if (range === 0) {
      return box.flat === "middle" ? box.height / 2 : box.height - box.padY;
    }
    return box.padY + (1 - (v - min) / range) * (box.height - box.padY * 2);
  };

  return values.map((v, i) => ({ x: x(i).toFixed(2), y: y(v).toFixed(2) }));
}

/** `"x,y x,y"` — the form an SVG `<polyline points>` takes. */
export function sparkPolyline(values: readonly number[], box: SparkBox): string {
  return sparkPoints(values, box)
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
}
